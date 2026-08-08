package com.ezarate.hospital.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Username or email is required")
        String usernameOrEmail,

        @NotBlank(message = "Password is required")
        String password,

        /**
         * Optional — if the frontend has the person pick a role before logging
         * in (matches your Login.jsx role selector), send it here so we can
         * reject a login attempt where the account's real role doesn't match
         * what was selected, same as the original AuthContext.login() did.
         */
        String role
) {}
