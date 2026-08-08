package com.ezarate.hospital.modules.medicineprescription.exception;

public class MedicinePrescriptionNotFoundException extends RuntimeException {
    public MedicinePrescriptionNotFoundException(String id) {
        super("No medicine prescription found with id " + id);
    }
}
