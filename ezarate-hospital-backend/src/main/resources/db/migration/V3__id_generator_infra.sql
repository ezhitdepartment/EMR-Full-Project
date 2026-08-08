-- V3__id_generator_infra.sql
-- Shared infrastructure for human-readable, race-safe sequential IDs like
-- "E-20260706-0018" / "LAB-20260706-0018" / "MED-20260706-0018".
--
-- Your original Supabase schema computed these as `count(*) + 1` against
-- today's rows, which is NOT atomic — two saves close together (a
-- double-click, two staff saving at once) could both count the same
-- existing rows and collide on the same ID, which is exactly the
-- "duplicate key value violates unique constraint" bug your later
-- addendum had to fix. This starts straight from that fix: one shared,
-- atomic "per day, per prefix" counter table.

CREATE TABLE daily_id_counters (
    id_key  VARCHAR(30) PRIMARY KEY, -- "<prefix><YYYYMMDD>", e.g. "E-20260706"
    last_no INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION generate_daily_sequence_id(p_prefix TEXT, p_width INT DEFAULT 4)
RETURNS TEXT AS $$
DECLARE
    v_key TEXT := p_prefix || to_char(now(), 'YYYYMMDD');
    v_no  INT;
BEGIN
    INSERT INTO daily_id_counters (id_key, last_no)
    VALUES (v_key, 1)
    ON CONFLICT (id_key) DO UPDATE SET last_no = daily_id_counters.last_no + 1
    RETURNING last_no INTO v_no;

    RETURN v_key || '-' || lpad(v_no::text, p_width, '0');
END;
$$ LANGUAGE plpgsql;
