package com.ezarate.hospital.modules.user.service;

import com.ezarate.hospital.modules.consultation.repository.ConsultationRepository;
import com.ezarate.hospital.modules.patient.repository.PatientRepository;
import com.ezarate.hospital.modules.user.dto.CreateUserRequest;
import com.ezarate.hospital.modules.user.dto.DeleteAccountRequest;
import com.ezarate.hospital.modules.user.dto.UserActivityStatsResponse;
import com.ezarate.hospital.modules.user.dto.UserResponse;
import com.ezarate.hospital.modules.user.entity.User;
import com.ezarate.hospital.modules.user.exception.CannotModifySelfException;
import com.ezarate.hospital.modules.user.exception.DuplicateUserException;
import com.ezarate.hospital.modules.user.exception.InvalidAdminConfirmationException;
import com.ezarate.hospital.modules.user.exception.InvalidRoleException;
import com.ezarate.hospital.modules.user.exception.UserNotFoundException;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Everything Roles.jsx / Users.jsx / Archive.jsx / UserProfilePage.jsx used
 * to reach via supabase-js + the admin-* Edge Functions (see the header
 * comment in the old adminUsers.js) — now plain REST, backed by our own
 * `users` table instead of Supabase Auth, so there's no service_role key or
 * separate Auth product involved at all.
 */
@Service
public class UserAdminService {

    // Matches src/data/roles.js's ROLE_OPTIONS exactly.
    private static final Set<String> VALID_ROLES = Set.of(
            "admin", "doctor", "er_nurse", "opd_nurse", "med_tech",
            "xray_tech", "pharmacist", "staff"
    );

    // What resetToOriginalPassword() actually does on the frontend today —
    // see ResetPasswordModal.jsx's copy ("...password to the temporary
    // password Temporary123"). The older AES-encrypted-original-password
    // design described in some schema notes was superseded by this simpler,
    // safer fixed-temp-password approach before it shipped, so that's what
    // this mirrors.
    private static final String TEMPORARY_PASSWORD = "Temporary123";

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final ConsultationRepository consultationRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUserProvider;

    public UserAdminService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            ConsultationRepository consultationRepository,
            PasswordEncoder passwordEncoder,
            CurrentUserProvider currentUserProvider
    ) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.consultationRepository = consultationRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list(String status) {
        List<User> users = (status == null || status.isBlank())
                ? userRepository.findAllByOrderByCreatedAtDesc()
                : userRepository.findAllByStatusOrderByCreatedAtDesc(status);
        return users.stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        return UserResponse.from(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public UserActivityStatsResponse activityStats(UUID id) {
        findOrThrow(id); // 404 if the profile itself doesn't exist, matching getUserById's behavior
        long patientsCreated = patientRepository.countByCreatedBy_Id(id);
        long consultationsAuthored = consultationRepository.countByAuthor_Id(id);
        long patientsConsulted = consultationRepository.countDistinctPatientsByAuthorId(id);
        return new UserActivityStatsResponse(patientsCreated, consultationsAuthored, patientsConsulted);
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String role = request.role();
        if (!VALID_ROLES.contains(role)) {
            throw new InvalidRoleException(role);
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new DuplicateUserException("That username is already taken.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateUserException("That email is already in use.");
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .prefix(request.prefix() == null ? "" : request.prefix())
                .firstName(request.firstName() == null ? "" : request.firstName())
                .lastName(request.lastName() == null ? "" : request.lastName())
                .licenseNumber(request.licenseNumber() == null ? "" : request.licenseNumber())
                .status("active")
                .build();

        return UserResponse.from(userRepository.save(user));
    }

    /** Matches setAccountSuspension(targetUserId, suspend) — returns the resulting status string. */
    @Transactional
    public String setSuspension(UUID id, boolean suspend) {
        User user = findOrThrow(id);

        if (suspend && id.equals(currentUserProvider.requireCurrentUserId())) {
            throw new CannotModifySelfException("You can't suspend your own account.");
        }

        user.setStatus(suspend ? "suspended" : "active");
        userRepository.save(user);
        return user.getStatus();
    }

    /** Matches resetToOriginalPassword() — resets to the fixed temporary password. */
    @Transactional
    public void resetPassword(UUID id) {
        User user = findOrThrow(id);
        user.setPasswordHash(passwordEncoder.encode(TEMPORARY_PASSWORD));
        userRepository.save(user);
    }

    /** Matches deleteAccount({targetUserId, adminUsername, adminPassword}) — step-up confirmed, then hard-deletes. */
    @Transactional
    public void delete(UUID id, DeleteAccountRequest request) {
        User target = findOrThrow(id);

        UUID callingAdminId = currentUserProvider.requireCurrentUserId();
        if (id.equals(callingAdminId)) {
            throw new CannotModifySelfException("You can't delete your own account.");
        }

        User callingAdmin = userRepository.findById(callingAdminId)
                .orElseThrow(() -> new IllegalStateException(
                        "Authenticated user no longer exists: " + callingAdminId));

        boolean usernameMatches = callingAdmin.getUsername().equalsIgnoreCase(request.adminUsername());
        boolean passwordMatches = passwordEncoder.matches(request.adminPassword(), callingAdmin.getPasswordHash());
        if (!usernameMatches || !passwordMatches) {
            throw new InvalidAdminConfirmationException();
        }

        // Every created_by / author_id / generated_by / uploaded_by / updated_by
        // FK referencing users is ON DELETE SET NULL (see the migrations) —
        // the clinical records this account created stay intact, only the
        // "who did this" pointer goes to null. Only login_events keeps a
        // denormalized snapshot of who they were, unaffected by this delete.
        userRepository.delete(target);
    }

    /** Matches saveUserPhoto(userId, photoDataUrl). */
    @Transactional
    public UserResponse updatePhoto(UUID id, String photoDataUrl) {
        User user = findOrThrow(id);
        user.setPhoto(photoDataUrl);
        return UserResponse.from(userRepository.save(user));
    }

    private User findOrThrow(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id));
    }
}
