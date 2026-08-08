-- V12__lab_test_code_counters.sql
-- Race-safe generation for per-test diagnostic tracking codes like
-- "CBC-202607-0036" (code_prefix from lab_test_catalog, then the current
-- year/month, then a per-month sequence).
--
-- The old Supabase-era frontend computed this as
-- `count(lab_order_tests where test_name=... and code LIKE 'CBC-202607-%') + 1`
-- run from the browser — NOT atomic, the exact same class of bug
-- V3__id_generator_infra.sql's daily_id_counters was introduced to fix for
-- encounter/lab-order/prescription IDs. This gives diagnostic codes the
-- same atomic "insert or increment" counter table instead, keyed by
-- (code_prefix, period) rather than by a single daily id_key, since these
-- reset monthly rather than daily and are scoped per test-type prefix.

CREATE TABLE lab_test_code_counters (
    code_prefix VARCHAR(20) NOT NULL,
    period      VARCHAR(6)  NOT NULL, -- "YYYYMM"
    last_no     INT NOT NULL DEFAULT 0,
    PRIMARY KEY (code_prefix, period)
);

CREATE OR REPLACE FUNCTION generate_lab_test_code(p_test_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_period TEXT := to_char(now(), 'YYYYMM');
    v_no     INT;
BEGIN
    SELECT code_prefix INTO v_prefix FROM lab_test_catalog WHERE test_name = p_test_name;
    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Unknown lab test: %', p_test_name;
    END IF;

    INSERT INTO lab_test_code_counters (code_prefix, period, last_no)
    VALUES (v_prefix, v_period, 1)
    ON CONFLICT (code_prefix, period) DO UPDATE SET last_no = lab_test_code_counters.last_no + 1
    RETURNING last_no INTO v_no;

    RETURN v_prefix || '-' || v_period || '-' || lpad(v_no::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Backfill from any codes already sitting in lab_order_tests (e.g. rows
-- carried over from the old Supabase database via a data export/import),
-- so the counter starts at least as high as what's already in use instead
-- of immediately reissuing a code that's already taken.
INSERT INTO lab_test_code_counters (code_prefix, period, last_no)
SELECT c.code_prefix,
       substring(t.code FROM '-(\d{6})-') AS period,
       max(substring(t.code FROM '(\d{4})$')::int) AS last_no
FROM lab_order_tests t
JOIN lab_test_catalog c ON c.test_name = t.test_name
WHERE t.code ~ '^.+-\d{6}-\d{4}$'
GROUP BY c.code_prefix, substring(t.code FROM '-(\d{6})-')
ON CONFLICT (code_prefix, period) DO UPDATE
    SET last_no = GREATEST(lab_test_code_counters.last_no, EXCLUDED.last_no);
