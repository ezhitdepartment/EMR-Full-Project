package com.ezarate.hospital.modules.encounter.exception;

public class EncounterNotFoundException extends RuntimeException {
    public EncounterNotFoundException(String id) {
        super("No registration found with id " + id);
    }
}