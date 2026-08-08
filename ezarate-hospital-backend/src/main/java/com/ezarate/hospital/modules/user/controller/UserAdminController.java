package com.ezarate.hospital.modules.user.controller;

import com.ezarate.hospital.modules.user.dto.CreateUserRequest;
import com.ezarate.hospital.modules.user.dto.DeleteAccountRequest;
import com.ezarate.hospital.modules.user.dto.SuspensionRequest;
import com.ezarate.hospital.modules.user.dto.UserActivityStatsResponse;
import com.ezarate.hospital.modules.user.dto.UserPhotoRequest;
import com.ezarate.hospital.modules.user.dto.UserResponse;
import com.ezarate.hospital.modules.user.service.UserAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Everything here used to be either a raw `supabase.from("profiles")` call
 * (guarded only by RLS) or one of the admin-* Edge Functions (see the old
 * utils/adminUsers.js) — all admin-only now via the class-level
 * @PreAuthorize, same "ADMIN" role check either way.
 */
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    /** Roles.jsx's staff list. ?status=suspended backs Archive.jsx's loadArchivedAccounts(). */
    @GetMapping
    public List<UserResponse> list(@RequestParam(required = false) String status) {
        return userAdminService.list(status);
    }

    @GetMapping("/{id}")
    public UserResponse getById(@PathVariable UUID id) {
        return userAdminService.getById(id);
    }

    @GetMapping("/{id}/activity-stats")
    public UserActivityStatsResponse activityStats(@PathVariable UUID id) {
        return userAdminService.activityStats(id);
    }

    /** Settings.jsx's "Add Staff Account" form. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return userAdminService.create(request);
    }

    /** Roles.jsx's Suspend/Unsuspend toggle. Returns the resulting status so the row can update in place. */
    @PatchMapping("/{id}/suspension")
    public Map<String, String> setSuspension(@PathVariable UUID id, @Valid @RequestBody SuspensionRequest request) {
        return Map.of("status", userAdminService.setSuspension(id, request.suspend()));
    }

    /** ResetPasswordModal.jsx — resets to the fixed temporary password. */
    @PostMapping("/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable UUID id) {
        userAdminService.resetPassword(id);
    }

    /** DeleteAccountModal.jsx — requires the calling admin's own credentials as step-up confirmation. */
    @PostMapping("/{id}/delete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, @Valid @RequestBody DeleteAccountRequest request) {
        userAdminService.delete(id, request);
    }

    /** UserProfilePage.jsx's photo capture/upload. */
    @PatchMapping("/{id}/photo")
    public UserResponse updatePhoto(@PathVariable UUID id, @Valid @RequestBody UserPhotoRequest request) {
        return userAdminService.updatePhoto(id, request.photo());
    }
}
