package com.ezarate.hospital.modules.user.dto;

import jakarta.validation.constraints.NotBlank;

/** Matches saveUserPhoto(userId, photoDataUrl) — a base64 data URL, stored directly. */
public record UserPhotoRequest(
        @NotBlank(message = "Photo is required") String photo
) {
}
