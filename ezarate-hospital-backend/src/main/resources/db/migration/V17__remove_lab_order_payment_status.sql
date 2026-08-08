-- V17__remove_lab_order_payment_status.sql
--
-- Cashier role is being removed from the Lab Order / X-Ray Order workflow.
-- Orders (and their tests) are now visible/editable to Med Tech / X-ray
-- Tech as soon as the order is created — no more "must be marked Paid
-- first" gate. Drops the column and its check constraint entirely rather
-- than just ignoring it, so there's no dangling NOT NULL column the app
-- no longer writes to.

ALTER TABLE lab_orders DROP CONSTRAINT IF EXISTS chk_lab_orders_payment_status;
ALTER TABLE lab_orders DROP COLUMN IF EXISTS payment_status;
