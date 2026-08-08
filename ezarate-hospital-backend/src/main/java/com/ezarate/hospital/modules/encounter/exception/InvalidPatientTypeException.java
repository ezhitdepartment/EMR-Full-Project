package com.ezarate.hospital.modules.encounter.exception;

/**
 * Thrown both for a patientType value outside {"ER Patient", "OPD Patient"}
 * and for a role trying to reach a patientType it isn't scoped to (e.g. an
 * opd_nurse creating/reading an "ER Patient" registration) — the same split
 * current_user_can_access_patient_type() used to enforce via RLS.
 */
public class InvalidPatientTypeException extends RuntimeException {
    public InvalidPatientTypeException(String message) {
        super(message);
    }
}