-- V7__medicine_prescriptions.sql

CREATE TABLE medicine_prescriptions (
    id             VARCHAR(30) PRIMARY KEY DEFAULT generate_daily_sequence_id('MED-'),
    patient_id     UUID NOT NULL REFERENCES patients (id),

    -- Nullable: the standalone "/medicine-prescriptions/add" flow isn't
    -- tied to a specific registration. When set (from the Consultation
    -- Form), the partial unique index below enforces one prescription per
    -- visit — re-saving updates the same row instead of stacking a
    -- duplicate.
    encounter_id   VARCHAR(30) REFERENCES encounters (id) ON DELETE SET NULL,

    prescribed_by  VARCHAR(150) NOT NULL, -- prescribing physician's name

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT chk_medicine_prescriptions_status CHECK (status IN ('ACTIVE', 'CANCELLED')),

    created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    date_created   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicine_prescriptions_patient   ON medicine_prescriptions (patient_id);
CREATE INDEX idx_medicine_prescriptions_status    ON medicine_prescriptions (status);

CREATE UNIQUE INDEX uq_medicine_prescriptions_one_per_encounter
    ON medicine_prescriptions (encounter_id)
    WHERE encounter_id IS NOT NULL;


CREATE TABLE prescription_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id VARCHAR(30) NOT NULL REFERENCES medicine_prescriptions (id) ON DELETE CASCADE,
    medicine_name   VARCHAR(150) NOT NULL,
    milligram       VARCHAR(30),
    quantity        INT NOT NULL DEFAULT 1,
    instructions    TEXT -- Sig/dosage, e.g. "1 tablet 3x a day after meals"
);

CREATE INDEX idx_prescription_items_prescription ON prescription_items (prescription_id);
