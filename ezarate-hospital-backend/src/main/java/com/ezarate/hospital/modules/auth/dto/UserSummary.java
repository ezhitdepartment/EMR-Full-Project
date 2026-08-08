package com.ezarate.hospital.modules.auth.dto;

import com.ezarate.hospital.modules.user.entity.User;

import java.util.UUID;

public record UserSummary(
        UUID id,
        String username,
        String role,
        String prefix,
        String firstName,
        String lastName,
        String email,
        String licenseNumber,
        String status,
        String photo
) {
    public static UserSummary from(User user) {
        return new UserSummary(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getPrefix(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getLicenseNumber(),
                user.getStatus(),
                user.getPhoto()
        );
    }
}
