#!/usr/bin/env python3
"""
transform_supabase_dump.py
---------------------------------
Converts a Supabase (pg_dump --data-only) export into an INSERT script
that matches the new Spring Boot / Flyway schema in hospital-backend.

Handles the known differences between the old Supabase schema and the
new one:

  1. Drops tables that no longer exist in the new schema (their job was
     replaced by app code / Spring Security):
       - role_feature_access
       - role_feature_denylist
       - user_initial_credentials

  2. profiles -> users
       - table renamed
       - a password_hash column is added and populated with a real
         BCrypt hash (generated in Postgres via pgcrypto's crypt()/
         gen_salt('bf'), so no external bcrypt library is needed and the
         hash is 100% compatible with Spring Security's
         BCryptPasswordEncoder).
       - every migrated account gets the SAME temporary password
         (see TEMP_PASSWORD below) — force everyone to change it after
         first login. The real original passwords only ever lived in
         Supabase Auth (auth.users), which is not part of this
         data-only dump, so they cannot be recovered here.

  3. patients: drops 3 columns that don't exist in the new schema
     (patient_type now lives only on `encounters`; photo_url was
     replaced by `photo`; `guardian` was superseded by the separate
     patient_guardians table).

  4. encounters: renames the photo_url column to photo (same data,
     new column name — matches the users/patients photo columns).

  5. Strips pg_dump 17's `\\restrict` / `\\unrestrict` meta-commands,
     which older psql/pgAdmin clients don't understand.

Every other table (patients minus the 3 columns aside) already has an
identical column layout between old and new schema, so those rows pass
through unchanged.

USAGE
-----
    python3 transform_supabase_dump.py supabase_data.sql import_data.sql

The input file can be the raw UTF-16 export straight out of Supabase's
"Database -> Backups -> Download" or `pg_dump` — this script detects and
handles the encoding for you.

Then load the result into your NEW (already Flyway-migrated) database:

    psql "postgresql://postgres:postgres@localhost:5432/ezarate_hospital" \\
         -v ON_ERROR_STOP=1 -f import_data.sql
"""

import re
import sys

SCRIPT_VERSION = "v6-multiline_insert_fix"

TEMP_PASSWORD = "ChangeMe123!"  # <-- change this, then tell your 18 staff to log in and reset it

DROPPED_TABLES = {"role_feature_access", "role_feature_denylist", "user_initial_credentials"}

INSERT_RE = re.compile(
    r"^INSERT INTO public\.(?P<table>[a-zA-Z0-9_]+)\s*\((?P<cols>.*?)\)\s*VALUES\s*\((?P<vals>.*)\);\s*$",
    re.DOTALL,  # cols/vals may legitimately contain a real newline (e.g. a
                # textarea value with an embedded line break) once multi-line
                # statements are reassembled in transform()
)


def split_top_level(s: str) -> list[str]:
    """Split a SQL VALUES tuple's inner text on commas, respecting
    single-quoted string literals (with '' as an escaped quote) so that
    commas inside addresses / JSON / free text don't get split."""
    parts = []
    buf = []
    in_str = False
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if in_str:
            if ch == "'":
                if i + 1 < n and s[i + 1] == "'":
                    buf.append("''")
                    i += 2
                    continue
                in_str = False
                buf.append(ch)
            else:
                buf.append(ch)
        else:
            if ch == "'":
                in_str = True
                buf.append(ch)
            elif ch == ",":
                parts.append("".join(buf).strip())
                buf = []
            else:
                buf.append(ch)
        i += 1
    parts.append("".join(buf).strip())
    return parts


def statement_is_complete(stmt: str) -> bool:
    """True if `stmt` (one or more physical lines glued together) ends with a
    top-level ');' that is NOT inside an open single-quoted string.

    This is what lets us tell the difference between:
      - a normal one-line INSERT (complete after line 1), and
      - an INSERT whose VALUES contains a literal newline (e.g. someone
        typed Enter inside a textarea like reason_for_visiting) — which
        pg_dump prints as a real newline inside the quotes, so the
        statement is NOT actually finished at the first line break even
        though that line looks like it ends mid-sentence.
    """
    in_str = False
    i = 0
    n = len(stmt)
    while i < n:
        ch = stmt[i]
        if in_str:
            if ch == "'":
                if i + 1 < n and stmt[i + 1] == "'":
                    i += 2
                    continue
                in_str = False
            i += 1
        else:
            if ch == "'":
                in_str = True
            i += 1
    return (not in_str) and stmt.rstrip().endswith(");")


def read_dump(path: str) -> str:
    raw = open(path, "rb").read()
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        text = raw.decode("utf-16")
    else:
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("utf-16")
    return text.replace("\r\n", "\n")


def transform(text: str) -> str:
    out_lines = []
    # Populated as we walk the dump: lab_order_tests always appears before
    # lab_order_test_files in a pg_dump data-only export, so a single
    # forward pass is enough to resolve test_id -> its parent order_id.
    test_to_order: dict[str, str] = {}

    lines = text.split("\n")
    n_lines = len(lines)
    i = 0
    while i < n_lines:
        line = lines[i]
        stripped = line.strip()

        # pg_dump 17 restricted-mode markers — not understood by older clients
        if stripped.startswith("\\restrict") or stripped.startswith("\\unrestrict"):
            i += 1
            continue

        # pg_dump 17 emits this session setting; Postgres < 17 (e.g. your
        # postgres:16-alpine container) doesn't recognize it and aborts
        # with "unrecognized configuration parameter".
        if stripped.startswith("SET transaction_timeout"):
            i += 1
            continue

        # pg_dump blanks the search_path for safety on restore. That's
        # fine for plain data, but this schema has live triggers
        # (notify_new_patient, notify_new_registration, etc. from
        # V11__notifications.sql) that reference tables unqualified —
        # with an empty search_path they can't resolve "notifications"
        # and the INSERT that fires them fails. Leaving search_path at
        # its default (public) lets those triggers work as intended.
        if "set_config('search_path'" in stripped:
            i += 1
            continue

        # Reassemble multi-line INSERTs: pg_dump prints a literal newline
        # inside the quotes whenever the original data itself contains one
        # (e.g. someone hit Enter inside a "reason for visiting" textarea).
        # That means the statement's closing ');' can land on a LATER
        # physical line than the one starting with "INSERT INTO", so a
        # naive line-by-line regex match silently skips transforming that
        # one row (it never matches ^...$ on the truncated first line).
        stmt_lines = None
        if stripped.startswith("INSERT INTO public."):
            stmt_lines = [line]
            j = i
            while not statement_is_complete("\n".join(stmt_lines)):
                j += 1
                if j >= n_lines:
                    raise SystemExit(
                        f"Ran off the end of the file looking for the closing ');' "
                        f"of the INSERT starting at line {i + 1} — dump may be truncated."
                    )
                stmt_lines.append(lines[j])
            full_stmt = "\n".join(stmt_lines).strip()
            i = j + 1
        else:
            full_stmt = None
            i += 1

        if full_stmt is None:
            out_lines.append(line)
            continue

        m = INSERT_RE.match(full_stmt)
        if not m:
            out_lines.append(line if len(stmt_lines) == 1 else full_stmt)
            continue

        table = m.group("table")
        cols = [c.strip() for c in m.group("cols").split(",")]
        vals = split_top_level(m.group("vals"))

        if table in DROPPED_TABLES:
            continue  # table no longer exists in the new schema

        if table == "patients":
            drop = {"patient_type", "photo_url", "guardian"}
            keep_idx = [i for i, c in enumerate(cols) if c not in drop]
            cols = [cols[i] for i in keep_idx]
            vals = [vals[i] for i in keep_idx]

        if table == "encounters":
            cols = ["photo" if c == "photo_url" else c for c in cols]

        if table == "lab_order_tests":
            # Remember this test's parent order, for the file-table fixup below.
            id_val = vals[cols.index("id")]
            order_val = vals[cols.index("order_id")]
            test_to_order[id_val] = order_val

        if table == "lab_order_test_files":
            # V15 migration: table renamed, and files now hang off the
            # whole order (order_id) instead of a single test (test_id).
            table = "lab_order_files"
            test_idx = cols.index("test_id")
            test_val = vals[test_idx]
            order_val = test_to_order.get(test_val)
            if order_val is None:
                raise SystemExit(
                    f"Could not resolve order_id for lab_order_test_files.test_id={test_val} "
                    "— its lab_order_tests row wasn't seen yet. Check dump ordering."
                )
            cols[test_idx] = "order_id"
            vals[test_idx] = order_val

        if table == "profiles":
            table = "users"
            cols.append("password_hash")
            # Schema-qualified: the dump itself resets search_path to ''
            # (pg_dump's standard safety behavior), so bare crypt()/
            # gen_salt() calls would otherwise fail to resolve.
            vals.append("public.crypt('%s', public.gen_salt('bf'))" % TEMP_PASSWORD)

        out_lines.append(
            f"INSERT INTO public.{table} ({', '.join(cols)}) VALUES ({', '.join(vals)});"
        )

    return "\n".join(out_lines) + "\n"


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    print(f"transform_supabase_dump.py {SCRIPT_VERSION}")
    text = read_dump(src)
    result = transform(text)
    header = (
        "-- Generated by transform_supabase_dump.py\n"
        "-- Every migrated account's password is temporarily: %s\n"
        "-- Make every one of those 18 staff change it on first login.\n\n"
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n"
    ) % TEMP_PASSWORD
    with open(dst, "w", encoding="utf-8") as f:
        f.write(header)
        f.write(result)
    print(f"Wrote {dst}")


if __name__ == "__main__":
    main()
