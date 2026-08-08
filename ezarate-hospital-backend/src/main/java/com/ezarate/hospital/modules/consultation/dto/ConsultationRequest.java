package com.ezarate.hospital.modules.consultation.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.Map;

public record ConsultationRequest(
        String encounterId,

        @NotBlank(message = "Author role is required")
        String authorRole,

        String chiefComplaint,
        String historyOfPresentIllness,
        String diagnosis,
        String medicationOrders,
        String disposition,
        String dispositionNotes,
        String allergies,
        String bloodType,

        String admittingDiagnosis,
        String dischargeDiagnosis,
        String caseRateCode1,
        String caseRateCode2,
        LocalDate dateAdmitted,
        LocalDate dateDischarged,
        String outcomeOfTreatment,

        // Everything else the 100+-field Consultation Form captures
        // (checklists, Course in the Ward entries, referral/certification
        // fields, etc.) - stored as-is in the `details` jsonb column.
        Map<String, Object> details
) {}
