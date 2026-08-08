package com.ezarate.hospital.modules.admittedpatient.exception;

public class AdmittedPatientNotFoundException extends RuntimeException {

    public AdmittedPatientNotFoundException(String consultationId) {
        super("No admitted-patient record found for consultation " + consultationId);
    }
}
