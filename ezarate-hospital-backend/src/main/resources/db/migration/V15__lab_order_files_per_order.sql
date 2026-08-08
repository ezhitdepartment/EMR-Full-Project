-- V15__lab_order_files_per_order.sql
--
-- Lab/X-Ray result file uploads move from being attached to a single
-- diagnostic test (lab_order_tests) to being attached to the WHOLE order
-- (lab_orders) — one upload area per lab order, shared across every
-- diagnostic listed on it, instead of a separate upload per test.
--
-- Renames lab_order_test_files -> lab_order_files and repoints it at
-- lab_orders (order_id) instead of lab_order_tests (test_id). Existing
-- files are carried over to their test's parent order, so nothing
-- uploaded before this migration is lost.

ALTER TABLE lab_order_test_files RENAME TO lab_order_files;

ALTER TABLE lab_order_files
    ADD COLUMN order_id VARCHAR(30) REFERENCES lab_orders (id) ON DELETE CASCADE;

UPDATE lab_order_files f
SET order_id = t.order_id
FROM lab_order_tests t
WHERE f.test_id = t.id;

ALTER TABLE lab_order_files ALTER COLUMN order_id SET NOT NULL;

ALTER TABLE lab_order_files DROP CONSTRAINT IF EXISTS lab_order_test_files_test_id_fkey;
ALTER TABLE lab_order_files DROP COLUMN test_id;

DROP INDEX IF EXISTS idx_lab_order_test_files_test;
CREATE INDEX idx_lab_order_files_order ON lab_order_files (order_id);
