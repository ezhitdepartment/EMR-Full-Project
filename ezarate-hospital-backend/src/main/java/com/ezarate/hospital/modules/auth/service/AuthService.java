package com.ezarate.hospital.modules.auth.service;

import com.ezarate.hospital.modules.auditlog.entity.LoginEvent;
import com.ezarate.hospital.modules.auditlog.repository.LoginEventRepository;
import com.ezarate.hospital.modules.auth.dto.ChangePasswordRequest;
import com.ezarate.hospital.modules.auth.dto.LoginRequest;
import com.ezarate.hospital.modules.auth.dto.LoginResponse;
import com.ezarate.hospital.modules.auth.dto.UpdateProfileRequest;
import com.ezarate.hospital.modules.auth.dto.UserSummary;
import com.ezarate.hospital.modules.auth.exception.AccountSuspendedException;
import com.ezarate.hospital.modules.auth.exception.InvalidCredentialsException;
import com.ezarate.hospital.modules.auth.exception.RoleMismatchException;
import com.ezarate.hospital.modules.auth.exception.WrongPasswordException;
import com.ezarate.hospital.modules.user.entity.User;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import com.ezarate.hospital.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginEventRepository loginEventRepository;
    private final CurrentUserProvider currentUserProvider;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            LoginEventRepository loginEventRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginEventRepository = loginEventRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameOrEmail(request.usernameOrEmail())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        if ("suspended".equals(user.getStatus())) {
            throw new AccountSuspendedException();
        }

        if (request.role() != null && !request.role().isBlank() && !request.role().equals(user.getRole())) {
            throw new RoleMismatchException();
        }

        LoginEvent event = LoginEvent.builder()
                .user(user)
                .username(user.getUsername())
                .role(user.getRole())
                .prefix(user.getPrefix())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .licenseNumber(user.getLicenseNumber())
                .build();
        loginEventRepository.save(event);

        String token = jwtService.generateToken(user);
        return new LoginResponse(token, UserSummary.from(user));
    }

    /** Backs GET /api/auth/me — session restore on page refresh, since there's no server-side session to re-check like Supabase's getSession() had. */
    @Transactional(readOnly = true)
    public UserSummary getCurrentUser() {
        User user = requireCurrentUser();
        return UserSummary.from(user);
    }

    /** Account Settings > Personal Information. Deliberately does NOT touch username/email/role/status — those are admin-only, via UserAdminService. */
    @Transactional
    public UserSummary updateProfile(UpdateProfileRequest request) {
        User user = requireCurrentUser();

        user.setPrefix(request.prefix() == null ? "" : request.prefix());
        user.setFirstName(request.firstName() == null ? "" : request.firstName());
        user.setLastName(request.lastName() == null ? "" : request.lastName());
        user.setLicenseNumber(request.licenseNumber() == null ? "" : request.licenseNumber());

        user = userRepository.save(user);
        return UserSummary.from(user);
    }

    /** Account Settings > Security Information — requires the correct OLD password, unlike UserAdminService's admin-triggered reset. */
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = requireCurrentUser();

        if (!passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new WrongPasswordException();
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private User requireCurrentUser() {
        UUID userId = currentUserProvider.requireCurrentUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists: " + userId));
    }
}