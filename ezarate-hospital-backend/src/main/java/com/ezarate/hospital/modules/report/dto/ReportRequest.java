package com.ezarate.hospital.modules.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Matches the report object Reports.jsx's handleGenerate() already builds
// client-side (reportType, year, generatedBy, rowCount, status) — id and
// generatedById are no longer sent by the client; the id is generated
// server-side (see ReportService.generateId()) and the "who generated
// this" link is derived from the caller's own JWT via CurrentUserProvider
// instead of being trusted from the request body.
public record ReportRequest(
        @NotBlank(message = "Report type is required") String reportType,
        @NotNull(message = "Year is required") Integer year,
        String generatedBy,
        Integer rowCount,
        String status
) {
}
