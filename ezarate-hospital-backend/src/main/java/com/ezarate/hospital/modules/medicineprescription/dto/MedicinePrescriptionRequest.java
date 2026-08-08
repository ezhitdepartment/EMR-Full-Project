package com.ezarate.hospital.modules.medicineprescription.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/**
 * Shared by both createMedicinePrescription() and
 * upsertMedicinePrescriptionForEncounter() — encounterId is optional; when
 * present, the write is scoped to "the one prescription for that visit"
 * (create-or-sync) instead of always inserting a new record.
 */
public record MedicinePrescriptionRequest(
        @NotNull UUID patientId,
        String encounterId,
        @NotBlank String prescribedBy,
        List<PrescriptionItemDto> items
) {
}
