package com.ezarate.hospital.modules.auth.dto;

public record LoginResponse(
        String token,
        UserSummary user
) {}
