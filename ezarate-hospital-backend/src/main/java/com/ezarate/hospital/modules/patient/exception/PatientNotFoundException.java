package com.ezarate.hospital.modules.patient.exception;

import java.util.UUID;

public class PatientNotFoundException extends RuntimeException {
    public PatientNotFoundException(UUID id) {
        super("No patient found with id " + id);
    }

    public PatientNotFoundException(String hospitalNo) {
        super("No patient found with hospital no " + hospitalNo);
    }
}
