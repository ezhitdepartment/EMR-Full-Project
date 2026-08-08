package com.ezarate.hospital.modules.laborder.exception;

public class UnknownLabTestException extends RuntimeException {
    public UnknownLabTestException(String testName) {
        super("\"" + testName + "\" is not a recognized diagnostic test");
    }
}
