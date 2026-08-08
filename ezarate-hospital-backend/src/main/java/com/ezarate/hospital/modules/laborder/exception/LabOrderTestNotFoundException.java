package com.ezarate.hospital.modules.laborder.exception;

import java.util.UUID;

public class LabOrderTestNotFoundException extends RuntimeException {
    public LabOrderTestNotFoundException(UUID id) {
        super("No lab order test found with id " + id);
    }
    public LabOrderTestNotFoundException(String orderId, String testName) {
        super("No test \"" + testName + "\" found on lab order " + orderId);
    }
}
