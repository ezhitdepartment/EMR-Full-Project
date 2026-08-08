package com.ezarate.hospital.modules.user.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DeleteAccountModal.jsx makes the CALLING admin re-enter their OWN
 * username/password as a step-up confirmation before a delete goes
 * through — this is that pair, verified server-side against whichever
 * admin the request's JWT identifies (never against the target account).
 */
public record DeleteAccountRequest(
        @NotBlank(message = "Your username is required") String adminUsername,
        @NotBlank(message = "Your password is required") String adminPassword
) {
}
