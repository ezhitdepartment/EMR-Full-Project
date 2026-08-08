package com.ezarate.hospital.modules.user.dto;

import com.ezarate.hospital.modules.user.entity.User;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Mirrors the old "profiles" row shape the frontend already expects
 * (adminUsers.js's rowToArchivedAccount(), Roles.jsx's table, UserProfilePage.jsx) —
 * same fields, just camelCase instead of snake_case since this comes back
 * as real JSON now instead of a Supabase client row.
 */
public record UserResponse(
        UUID id,
        String username,
        String role,
        String prefix,
        String firstName,
        String lastName,
        String email,
        String licenseNumber,
        String status,
        String photo,
        OffsetDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getPrefix(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getLicenseNumber(),
                user.getStatus(),
                user.getPhoto(),
                user.getCreatedAt()
        );
    }
}
