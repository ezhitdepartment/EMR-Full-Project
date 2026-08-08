package com.ezarate.hospital.modules.auth.controller;

import com.ezarate.hospital.modules.auth.dto.ChangePasswordRequest;
import com.ezarate.hospital.modules.auth.dto.LoginRequest;
import com.ezarate.hospital.modules.auth.dto.LoginResponse;
import com.ezarate.hospital.modules.auth.dto.UpdateProfileRequest;
import com.ezarate.hospital.modules.auth.dto.UserSummary;
import com.ezarate.hospital.modules.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** Session restore on page load/refresh — the frontend calls this with whatever JWT it has in localStorage. */
    @GetMapping("/me")
    public UserSummary me() {
        return authService.getCurrentUser();
    }

    @PutMapping("/me")
    public UserSummary updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(request);
    }

    @PutMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
    }
}