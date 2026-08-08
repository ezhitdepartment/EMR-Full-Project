package com.ezarate.hospital.modules.laborder.exception;

public class LabOrderNotFoundException extends RuntimeException {
    public LabOrderNotFoundException(String id) {
        super("No lab order found with id " + id);
    }
}
