package com.ezarate.hospital.modules.laborder.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Backs upsertLabOrderForEncounter(): syncs the one lab order tied to a
 * given registration to whatever is currently checked on the Consultation
 * Form's Diagnostics/Tests Ordered section, instead of stacking a new
 * order on every save.
 */
public record LabOrderUpsertForEncounterRequest(
        @NotNull UUID patientId,
        List<String> diagnostics,
        Map<String, String> testDetails
) {
}
