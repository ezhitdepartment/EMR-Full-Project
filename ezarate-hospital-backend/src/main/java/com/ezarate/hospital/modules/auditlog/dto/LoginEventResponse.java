package com.ezarate.hospital.modules.auditlog.dto;

import com.ezarate.hospital.modules.auditlog.entity.LoginEvent;

import java.time.OffsetDateTime;
import java.util.UUID;

public record LoginEventResponse(
        UUID id,
        UUID userId,
        String username,
        String role,
        String prefix,
        String firstName,
        String lastName,
        String email,
        String licenseNumber,
        OffsetDateTime loggedInAt
) {
    public static LoginEventResponse from(LoginEvent e) {
        return new LoginEventResponse(
                e.getId(),
                e.getUser() == null ? null : e.getUser().getId(),
                e.getUsername(), e.getRole(), e.getPrefix(),
                e.getFirstName(), e.getLastName(), e.getEmail(), e.getLicenseNumber(),
                e.getLoggedInAt()
        );
    }
}
