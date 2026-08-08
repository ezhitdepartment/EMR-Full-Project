package com.ezarate.hospital.modules.auth.dto;

public record UpdateProfileRequest(
        String prefix,
        String firstName,
        String lastName,
        String licenseNumber
) {}
