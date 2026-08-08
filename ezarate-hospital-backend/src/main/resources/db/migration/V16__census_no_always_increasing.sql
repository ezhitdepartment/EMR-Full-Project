-- V16__census_no_always_increasing.sql
--
-- Bug: generate_next_census_no() (V5) scoped its "what's the highest number
-- so far" lookup to the CURRENT period ("YYYY-MM"), so the running number
-- reset to 1 every time the month rolled over — e.g. "2026-07-1" followed
-- later by "2026-08-1", reusing a number already used in July.
--
-- Fix: the "{year}-{month}-" prefix is kept (still useful for reading at a
-- glance when a visit happened), but the running number itself is now
-- scoped only to patient_type, never to period — so it counts up forever
-- and can never repeat a number already issued in an earlier month.
--
-- e.g. ER Patient sequence becomes: 2026-07-1, 2026-07-2, 2026-08-3,
-- 2026-08-4, 2026-09-5, ... never back to 1.

-- Counter table: one ever-increasing row per patient_type instead of one
-- row per (period, patient_type). Collapse whatever's already there down
-- to the highest last_no seen per patient_type, so nothing goes backwards.
CREATE TEMP TABLE _census_no_counters_collapsed AS
SELECT patient_type, MAX(last_no) AS last_no
FROM census_no_counters
GROUP BY patient_type;

ALTER TABLE census_no_counters DROP CONSTRAINT census_no_counters_pkey;
DELETE FROM census_no_counters;
ALTER TABLE census_no_counters DROP COLUMN period;
ALTER TABLE census_no_counters ADD PRIMARY KEY (patient_type);

INSERT INTO census_no_counters (patient_type, last_no)
SELECT patient_type, last_no FROM _census_no_counters_collapsed;

DROP TABLE _census_no_counters_collapsed;

-- Same self-healing approach as before (checks the real MAX already in
-- `encounters` before incrementing, so it can never hand out a number
-- that's already taken) — just no longer filtered down to the current
-- period, so it sees every month's numbers, not just this one's.
CREATE OR REPLACE FUNCTION generate_next_census_no(p_patient_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_period     TEXT := to_char(now(), 'YYYY-MM');
    v_actual_max INT;
    v_no         INT;
BEGIN
    SELECT COALESCE(MAX(substring(census_no FROM '\d+$')::int), 0)
      INTO v_actual_max
      FROM encounters
     WHERE patient_type = p_patient_type
       AND census_no IS NOT NULL;

    INSERT INTO census_no_counters (patient_type, last_no)
    VALUES (p_patient_type, v_actual_max)
    ON CONFLICT (patient_type) DO UPDATE
        SET last_no = GREATEST(census_no_counters.last_no, v_actual_max);

    UPDATE census_no_counters
       SET last_no = last_no + 1
     WHERE patient_type = p_patient_type
    RETURNING last_no INTO v_no;

    RETURN v_period || '-' || v_no::text;
END;
$$ LANGUAGE plpgsql;
