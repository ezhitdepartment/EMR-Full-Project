package com.ezarate.hospital.modules.report.controller;

import com.ezarate.hospital.modules.report.dto.ReportRequest;
import com.ezarate.hospital.modules.report.dto.ReportResponse;
import com.ezarate.hospital.modules.report.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Backs Reports.jsx (features/reports) and Archive.jsx (features/archive),
// both of which just need the full "recent reports" ledger — matches the
// "reports" feature flag being granted to every role in role_feature_access
// (admin included, via its own "all" access), so no @PreAuthorize
// role-check is needed here beyond "authenticated", same as
// ConsultationController#getAll. Deleting a report row is the one
// exception — Admin-only, since it's irreversible.
@RestController
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/api/reports")
    public List<ReportResponse> list() {
        return reportService.list();
    }

    @PostMapping("/api/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResponse create(@Valid @RequestBody ReportRequest request) {
        return reportService.create(request);
    }

    // Archive.jsx's "Delete Permanently" button on the Archived Generated
    // Reports tab.
    @DeleteMapping("/api/reports/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermanently(@PathVariable String id) {
        reportService.deletePermanently(id);
    }
}
