package com.ezarate.hospital.modules.auditlog.exception;

import java.util.UUID;

public class LoginEventNotFoundException extends RuntimeException {
    public LoginEventNotFoundException(UUID id) {
        super("Audit log entry not found: " + id);
    }
}
