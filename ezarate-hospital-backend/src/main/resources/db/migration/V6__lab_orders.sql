-- V6__lab_orders.sql

CREATE TABLE lab_orders (
    id           VARCHAR(30) PRIMARY KEY DEFAULT generate_daily_sequence_id('LAB-'),
    patient_id   UUID NOT NULL REFERENCES patients (id),

    -- Nullable: manually-created orders (Lab Orders page's own "Create Lab
    -- Order" button) aren't tied to a registration and can repeat freely.
    -- When it IS set (auto-created from the doctor's Consultation Form),
    -- the partial unique index below guarantees only one order per visit.
    encounter_id VARCHAR(30) REFERENCES encounters (id) ON DELETE SET NULL,

    payment_status VARCHAR(10) NOT NULL DEFAULT 'unpaid',
    CONSTRAINT chk_lab_orders_payment_status CHECK (payment_status IN ('paid', 'unpaid')),

    created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    date_created TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_orders_patient   ON lab_orders (patient_id);
CREATE INDEX idx_lab_orders_encounter ON lab_orders (encounter_id);

CREATE UNIQUE INDEX uq_lab_orders_one_per_encounter
    ON lab_orders (encounter_id)
    WHERE encounter_id IS NOT NULL;


-- One row per diagnostic test within an order — this, not the order
-- itself, is the actual unit of work a Med Tech/X-ray Tech processes.
CREATE TABLE lab_order_tests (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   VARCHAR(30) NOT NULL REFERENCES lab_orders (id) ON DELETE CASCADE,
    test_name  VARCHAR(150) NOT NULL REFERENCES lab_test_catalog (test_name),
    code       VARCHAR(30), -- e.g. "CBC-202607-0036"

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    CONSTRAINT chk_lab_order_tests_status CHECK (status IN ('PENDING', 'DONE', 'CANCELLED')),

    -- Independent of `status`; only meaningful while status = PENDING.
    queue_status VARCHAR(30) NOT NULL DEFAULT 'WAITING',
    CONSTRAINT chk_lab_order_tests_queue_status CHECK (queue_status IN ('WAITING', 'SERVING')),

    is_referred    VARCHAR(10),
    performed_by   VARCHAR(150),
    date_performed DATE,
    fee            NUMERIC(10, 2),
    remarks        TEXT,
    test_detail    TEXT, -- free-text for "Others (...)" tests

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (order_id, test_name)
);

CREATE INDEX idx_lab_order_tests_order  ON lab_order_tests (order_id);
CREATE INDEX idx_lab_order_tests_status ON lab_order_tests (status);
CREATE INDEX idx_lab_order_tests_queue  ON lab_order_tests (queue_status) WHERE status = 'PENDING';

CREATE TRIGGER trg_lab_order_tests_updated_at
    BEFORE UPDATE ON lab_order_tests
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- Uploaded result files. storage_path is a relative path under whatever
-- local/NAS upload directory we configure — no Supabase Storage bucket.
CREATE TABLE lab_order_test_files (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id      UUID NOT NULL REFERENCES lab_order_tests (id) ON DELETE CASCADE,
    file_name    VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_order_test_files_test ON lab_order_test_files (test_id);
