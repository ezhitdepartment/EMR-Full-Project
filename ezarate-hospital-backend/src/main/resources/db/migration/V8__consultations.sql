-- V8__consultations.sql
-- Typed core + JSONB details hybrid: fields other tables/reports need to
-- filter or join on are real columns; the 100+-field Consultation Form's
-- remaining fields live in `details jsonb`.
--
-- One row per (encounter_id, author_role) — a re-save UPDATEs the
-- existing row instead of stacking a new one, matching your later fix.
-- updated_at (not created_at) is what "most recent" ordering should use
-- everywhere — created_at never changes after the first insert, so
-- re-edits of an older encounter would otherwise look "older" than a
-- never-edited newer one. This bit your CF4/Konsulta auto-fill logic
-- before; starting from the fixed version directly.

CREATE TABLE consultations (
    id            VARCHAR(30) PRIMARY KEY DEFAULT generate_daily_sequence_id('CONS-'),
    patient_id    UUID NOT NULL REFERENCES patients (id),
    encounter_id  VARCHAR(30) REFERENCES encounters (id),

    author_role VARCHAR(30) NOT NULL,
    CONSTRAINT chk_consultations_author_role CHECK (author_role IN (
        'er_nurse', 'opd_nurse', 'doctor', 'admin'
    )),
    author_id UUID REFERENCES users (id) ON DELETE SET NULL,

    -- Promoted fields — actually filtered/displayed directly by reports/lists.
    chief_complaint             TEXT,
    history_of_present_illness  TEXT,
    diagnosis                   TEXT,
    medication_orders           TEXT,
    disposition                 VARCHAR(100),
    disposition_notes           TEXT,
    allergies                   TEXT,
    blood_type                  VARCHAR(10),

    -- PhilHealth CF4 fields
    admitting_diagnosis   TEXT,
    discharge_diagnosis   TEXT,
    case_rate_code_1      VARCHAR(30),
    case_rate_code_2      VARCHAR(30),
    date_admitted         DATE,
    date_discharged       DATE,
    outcome_of_treatment  VARCHAR(50),

    -- Everything else the 100+-field form captures (Signs & Symptoms /
    -- Physical Exam checklists, Course in the Ward, referral fields,
    -- certification fields, etc.) — arrays/objects that wouldn't gain
    -- anything from being their own columns.
    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_patient               ON consultations (patient_id);
CREATE INDEX idx_consultations_encounter              ON consultations (encounter_id);
CREATE INDEX idx_consultations_author_role            ON consultations (author_role);
CREATE INDEX idx_consultations_updated_at             ON consultations (updated_at DESC);
CREATE INDEX idx_consultations_date_admitted          ON consultations (date_admitted);
CREATE INDEX idx_consultations_outcome_of_treatment   ON consultations (outcome_of_treatment);
CREATE INDEX idx_consultations_details_gin            ON consultations USING gin (details);

CREATE UNIQUE INDEX uq_consultations_one_per_encounter_role
    ON consultations (encounter_id, author_role)
    WHERE encounter_id IS NOT NULL;

CREATE TRIGGER trg_consultations_updated_at
    BEFORE UPDATE ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
