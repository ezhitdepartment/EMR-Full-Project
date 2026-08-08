package com.ezarate.hospital.modules.consultation.exception;

import java.util.List;

public class InvalidAuthorRoleException extends RuntimeException {
    public InvalidAuthorRoleException(String authorRole, List<String> validRoles) {
        super("Can't save a consultation authored by role \"" + authorRole
                + "\" - only " + String.join(", ", validRoles) + " can author one.");
    }
}
