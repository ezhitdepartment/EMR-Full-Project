package com.ezarate.hospital.modules.consultation.dto;

import com.ezarate.hospital.modules.consultation.entity.Consultation;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record ConsultationResponse(
        String id,
        UUID patientId,
        String hospitalNo,
        String encounterId,
        String authorRole,
        UUID authorId,

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

        Map<String, Object> details,

        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    // `details` is passed in already-parsed (from a JSON string to a Map)
    // by ConsultationService, since the entity itself only knows about
    // the raw JSON text, not how to turn it into a Map - that conversion
    // needs an ObjectMapper, which the DTO layer shouldn't depend on.
    public static ConsultationResponse from(Consultation c, Map<String, Object> parsedDetails) {
        return new ConsultationResponse(
                c.getId(),
                c.getPatient().getId(),
                c.getPatient().getHospitalNo(),
                c.getEncounterId(),
                c.getAuthorRole(),
                c.getAuthor() == null ? null : c.getAuthor().getId(),
                c.getChiefComplaint(),
                c.getHistoryOfPresentIllness(),
                c.getDiagnosis(),
                c.getMedicationOrders(),
                c.getDisposition(),
                c.getDispositionNotes(),
                c.getAllergies(),
                c.getBloodType(),
                c.getAdmittingDiagnosis(),
                c.getDischargeDiagnosis(),
                c.getCaseRateCode1(),
                c.getCaseRateCode2(),
                c.getDateAdmitted(),
                c.getDateDischarged(),
                c.getOutcomeOfTreatment(),
                parsedDetails,
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
