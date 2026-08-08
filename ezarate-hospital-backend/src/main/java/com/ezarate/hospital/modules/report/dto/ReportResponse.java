package com.ezarate.hospital.modules.report.dto;

import com.ezarate.hospital.modules.report.entity.GeneratedReport;

import java.time.OffsetDateTime;

// Field names are already camelCase and match what utils/reports.js's old
// rowToReport() used to hand-map from snake_case Supabase rows — so on the
// frontend side, this response can now be used as-is.
public record ReportResponse(
        String id,
        String reportType,
        Integer year,
        OffsetDateTime generatedAt,
        String generatedBy,
        String status,
        Integer rowCount
) {
    public static ReportResponse from(GeneratedReport r) {
        return new ReportResponse(
                r.getId(),
                r.getReportType(),
                r.getYear(),
                r.getGeneratedAt(),
                r.getGeneratedByName() != null ? r.getGeneratedByName() : "Unknown",
                r.getStatus() != null ? r.getStatus() : "Completed",
                r.getRowCount() != null ? r.getRowCount() : 0
        );
    }
}
