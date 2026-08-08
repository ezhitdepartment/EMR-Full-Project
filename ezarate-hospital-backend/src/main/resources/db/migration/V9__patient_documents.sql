-- V9__patient_documents.sql
-- One row per (patient, document type) — replaces what used to be four
-- separate localStorage blobs (patientEMR, patientDischarge,
-- patientKonsultaReferral, patientMedicalCertificate) plus Medical
-- Abstract and the Admission/Discharge Record, which got the same
-- treatment later. Keyed by hospital_no (your schema originally used the
-- old "P-2026671587" patient_id, then moved this over to hospital_no once
-- that became the sole identifier — starting from that end state).

CREATE TABLE patient_documents (
    hospital_no VARCHAR(20) NOT NULL REFERENCES patients (hospital_no) ON DELETE CASCADE,
    doc_type    VARCHAR(20) NOT NULL,
    CONSTRAINT chk_patient_documents_doc_type CHECK (doc_type IN (
        'emr', 'discharge', 'konsulta', 'medcert', 'medabstract', 'admitdischarge'
    )),
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (hospital_no, doc_type)
);

CREATE INDEX idx_patient_documents_hospital_no ON patient_documents (hospital_no);

CREATE TRIGGER trg_patient_documents_updated_at
    BEFORE UPDATE ON patient_documents
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
