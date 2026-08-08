package com.ezarate.hospital.modules.auditlog.controller;

import com.ezarate.hospital.modules.auditlog.dto.LoginEventResponse;
import com.ezarate.hospital.modules.auditlog.exception.LoginEventNotFoundException;
import com.ezarate.hospital.modules.auditlog.repository.LoginEventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final LoginEventRepository loginEventRepository;

    public AuditLogController(LoginEventRepository loginEventRepository) {
        this.loginEventRepository = loginEventRepository;
    }

    // Admin-only — mirrors the original schema's "login_events: admin read"
    // RLS policy, and matches AuditLogs.jsx living under features/admin.
    @GetMapping("/api/audit-logs")
    public Page<LoginEventResponse> list(@PageableDefault(size = 50) Pageable pageable) {
        return loginEventRepository.findAllByOrderByLoggedInAtDesc(pageable)
                .map(LoginEventResponse::from);
    }

    // Archive.jsx's "Delete Permanently" button on the Archived Audit Logs
    // tab — removes a single login-event row. No "cancelled/archived
    // state" precondition needed here (login_events is already an
    // append-only, purely historical trail — every row qualifies), unlike
    // encounters/lab orders/prescriptions.
    @DeleteMapping("/api/audit-logs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermanently(@PathVariable UUID id) {
        if (!loginEventRepository.existsById(id)) {
            throw new LoginEventNotFoundException(id);
        }
        loginEventRepository.deleteById(id);
    }
}
