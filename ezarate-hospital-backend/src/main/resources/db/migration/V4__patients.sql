-- V4__patients.sql
-- hospital_no is the ONE identifier for a patient — your schema went
-- through "P-2026671587" + a separate PIN before eventually retiring both
-- and making hospital_no the single source of truth. Starting straight
-- from that end state.
--
-- Format: a plain, ever-climbing, zero-padded 5-digit count — "00001",
-- "00002", ... (never resets, never repeats). Backed by a real Postgres
-- SEQUENCE, so concurrent registrations can't collide.

CREATE SEQUENCE hospital_no_seq START 1;

CREATE OR REPLACE FUNCTION generate_hospital_no()
RETURNS TEXT AS $$
BEGIN
    RETURN lpad(nextval('hospital_no_seq')::text, 5, '0');
END;
$$ LANGUAGE plpgsql;


CREATE TABLE patients (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_no  VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_hospital_no(),

    first_name   VARCHAR(100) NOT NULL,
    last_name    VARCHAR(100) NOT NULL,
    middle_name  VARCHAR(100) NOT NULL DEFAULT '',
    suffix       VARCHAR(20)  NOT NULL DEFAULT '',
    sex          VARCHAR(10)  NOT NULL,
    CONSTRAINT chk_patients_sex CHECK (sex IN ('Male', 'Female')),
    date_of_birth DATE NOT NULL,
    email        VARCHAR(255) NOT NULL DEFAULT '',
    landline     VARCHAR(30)  NOT NULL DEFAULT '',
    mobile       VARCHAR(30)  NOT NULL DEFAULT '',

    has_guardian BOOLEAN NOT NULL DEFAULT false,

    -- Address (PSGC-linked, matches AddressFields.jsx)
    address       TEXT NOT NULL,
    region        VARCHAR(100),
    region_code   VARCHAR(20),
    province      VARCHAR(100),
    province_code VARCHAR(20),
    city          VARCHAR(100),
    city_code     VARCHAR(20),
    barangay      VARCHAR(100),
    zip_code      VARCHAR(10),

    -- Family background
    mother_name    VARCHAR(150) NOT NULL DEFAULT '',
    mother_contact VARCHAR(30)  NOT NULL DEFAULT '',
    father_name    VARCHAR(150) NOT NULL DEFAULT '',
    father_contact VARCHAR(30)  NOT NULL DEFAULT '',
    nationality    VARCHAR(100) NOT NULL DEFAULT '',
    religion       VARCHAR(100) NOT NULL DEFAULT '',
    marital_status VARCHAR(30)  NOT NULL DEFAULT '',

    -- Emergency contact
    emergency_name         VARCHAR(150) NOT NULL DEFAULT '',
    emergency_address      TEXT         NOT NULL DEFAULT '',
    emergency_relationship VARCHAR(50)  NOT NULL DEFAULT '',
    emergency_phone_home   VARCHAR(30)  NOT NULL DEFAULT '',
    emergency_phone_cell   VARCHAR(30)  NOT NULL DEFAULT '',

    konsulta_eligibility VARCHAR(30) NOT NULL DEFAULT 'Not Set',

    photo TEXT, -- base64 data URL, same pattern as users.photo

    -- Cross-form auto-fill store shared by EMR / ER Discharge / Konsulta
    -- Referral / Medical Certificate (was `patientSharedClinical` in
    -- localStorage originally).
    shared_clinical JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_name         ON patients (last_name, first_name);
CREATE INDEX idx_patients_hospital_no  ON patients (hospital_no);

CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- One-to-one, only populated when has_guardian = true.
CREATE TABLE patient_guardians (
    patient_id    UUID PRIMARY KEY REFERENCES patients (id) ON DELETE CASCADE,
    first_name    VARCHAR(100),
    last_name     VARCHAR(100),
    middle_name   VARCHAR(100),
    suffix        VARCHAR(20),
    sex           VARCHAR(10),
    CONSTRAINT chk_patient_guardians_sex CHECK (sex IS NULL OR sex IN ('Male', 'Female')),
    date_of_birth DATE,
    pin           VARCHAR(30),
    landline      VARCHAR(30),
    mobile        VARCHAR(30)
);
