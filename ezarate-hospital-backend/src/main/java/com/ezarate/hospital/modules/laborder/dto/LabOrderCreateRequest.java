package com.ezarate.hospital.modules.laborder.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Creates a lab order for a patient. Mirrors createLabOrder()'s shape from
 * the old Supabase data layer: one row per name in {@code diagnostics},
 * optionally carrying a pre-generated {@code code} (see
 * generateDiagnosticCode in the frontend) and free-text
 * {@code testDetails} for "Others (...)" tests.
 */
public record LabOrderCreateRequest(
        @NotNull UUID patientId,
        String encounterId, // optional — set only when auto-created from a Consultation Form save
        @NotEmpty List<String> diagnostics,
        Map<String, String> testDetails, // testName -> free-text detail
        Map<String, String> testCodes    // testName -> pre-generated code
) {
}
