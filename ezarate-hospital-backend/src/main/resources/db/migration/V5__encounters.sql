-- V5__encounters.sql
-- Registration / Triage / Waiver. Includes the FINAL version of Census
-- No. logic after tracing through your "base -> split by patient_type ->
-- discard on cancel -> fires on doctor too -> counter can drift behind
-- reality" fix chain — this starts directly from the end state, not the
-- intermediate ones.

CREATE TABLE encounters (
    id                  VARCHAR(30) PRIMARY KEY DEFAULT generate_daily_sequence_id('E-'),
    patient_id          UUID NOT NULL REFERENCES patients (id),

    appointment_date       DATE NOT NULL,
    consultation_type      VARCHAR(100) NOT NULL, -- e.g. "PRIMARY CARE CONSULTATION"
    reason_for_visiting     TEXT,
    doctor                  VARCHAR(150), -- see doctors_directory note in V2
    fee                     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_type            VARCHAR(50), -- PHIC PAY / Cash / HMO / Company Sponsored

    photo TEXT, -- base64 data URL captured at registration

    -- Decided per-registration (not per-patient) by the role of whoever's
    -- registering — the same patient can be ER one visit, OPD the next.
    patient_type VARCHAR(30) NOT NULL DEFAULT 'OPD Patient',
    CONSTRAINT chk_encounters_patient_type CHECK (patient_type IN ('ER Patient', 'OPD Patient')),

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    CONSTRAINT chk_encounters_status CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),

    nurse_consultation_done  BOOLEAN NOT NULL DEFAULT false,
    doctor_consultation_done BOOLEAN NOT NULL DEFAULT false,

    -- Assigned once, automatically, the moment either consultation half is
    -- saved (see trigger below) — never set directly by the app.
    census_no VARCHAR(30),

    migrated_status VARCHAR(30) NOT NULL DEFAULT 'Not Migrated',
    pcu_status      VARCHAR(30) NOT NULL DEFAULT 'N/A',

    created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    date_created TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_encounters_patient ON encounters (patient_id);
CREATE INDEX idx_encounters_status  ON encounters (status);
CREATE INDEX idx_encounters_date    ON encounters (date_created);
CREATE INDEX idx_encounters_census_no ON encounters (census_no);

-- Unique per patient_type, not globally — "2026-07-3" can legitimately
-- exist once for an ER encounter AND once for an OPD encounter (each type
-- has its own counter, see below).
ALTER TABLE encounters
    ADD CONSTRAINT uq_encounters_census_no_patient_type UNIQUE (patient_type, census_no);


-- One-to-one with encounters. Vitals recorded by the nurse in TriagePage.jsx.
CREATE TABLE encounter_triage (
    encounter_id VARCHAR(30) PRIMARY KEY REFERENCES encounters (id) ON DELETE CASCADE,

    systolic          INT,
    diastolic         INT,
    heart_rate        INT,
    respiratory_rate  INT,
    temperature       NUMERIC(4, 1),
    height            NUMERIC(5, 1), -- cm
    weight            NUMERIC(5, 1), -- kg
    bmi               NUMERIC(5, 2), -- computed client-side from height/weight
    left_vision       VARCHAR(30),
    right_vision      VARCHAR(30),

    lab_imaging_enabled BOOLEAN NOT NULL DEFAULT true,
    fbs_glucose_mg_dl   NUMERIC(6, 2),
    fbs_glucose_mmol_l  NUMERIC(6, 2),
    fbs_date_performed  DATE,

    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_encounter_triage_updated_at
    BEFORE UPDATE ON encounter_triage
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- One-to-one with encounters. WaiverModal.jsx.
CREATE TABLE encounter_waivers (
    encounter_id  VARCHAR(30) PRIMARY KEY REFERENCES encounters (id) ON DELETE CASCADE,
    signed        BOOLEAN NOT NULL DEFAULT false,
    signed_by     VARCHAR(150),
    relationship  VARCHAR(50),
    waiver_date   DATE,
    reason        TEXT
);


-- ============================================================================
-- Census No. — "{year}-{month}-{running number}", e.g. "2026-07-1", reset
-- monthly, separate running number per patient_type (ER vs OPD).
-- ============================================================================

CREATE TABLE census_no_counters (
    period       VARCHAR(7)  NOT NULL, -- "YYYY-MM"
    patient_type VARCHAR(30) NOT NULL,
    last_no      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (period, patient_type)
);

-- Self-heals if the counter and reality ever drift apart (e.g. seed data
-- inserted with a manual census_no): checks the real MAX already in
-- `encounters` for that (period, patient_type) before incrementing, so it
-- can never hand out a number that's already taken.
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
       AND census_no LIKE v_period || '-%';

    INSERT INTO census_no_counters (period, patient_type, last_no)
    VALUES (v_period, p_patient_type, v_actual_max)
    ON CONFLICT (period, patient_type) DO UPDATE
        SET last_no = GREATEST(census_no_counters.last_no, v_actual_max);

    UPDATE census_no_counters
       SET last_no = last_no + 1
     WHERE period = v_period AND patient_type = p_patient_type
    RETURNING last_no INTO v_no;

    RETURN v_period || '-' || v_no::text;
END;
$$ LANGUAGE plpgsql;

-- Assigns census_no exactly once — the moment EITHER
-- nurse_consultation_done OR doctor_consultation_done first flips to true
-- (whichever happens first). Clears it back to NULL if the encounter is
-- cancelled (a cancelled visit shouldn't occupy a Census slot); if later
-- reactivated with a done-flag already true, a fresh number is issued.
CREATE OR REPLACE FUNCTION set_encounter_census_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'CANCELLED' THEN
        NEW.census_no := NULL;
    ELSIF (NEW.nurse_consultation_done = true OR NEW.doctor_consultation_done = true)
          AND NEW.census_no IS NULL THEN
        NEW.census_no := generate_next_census_no(COALESCE(NEW.patient_type, 'OPD Patient'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_encounters_set_census_no
    BEFORE INSERT OR UPDATE ON encounters
    FOR EACH ROW
    EXECUTE FUNCTION set_encounter_census_no();
