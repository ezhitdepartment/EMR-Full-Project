package com.ezarate.hospital.modules.report.exception;

public class GeneratedReportNotFoundException extends RuntimeException {
    public GeneratedReportNotFoundException(String id) {
        super("Generated report not found: " + id);
    }
}
