package com.ezarate.hospital.modules.encounter.dto;

import com.ezarate.hospital.modules.encounter.entity.EncounterTriage;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TriageResponse(
        String encounterId,
        Integer systolic,
        Integer diastolic,
        Integer heartRate,
        Integer respiratoryRate,
        BigDecimal temperature,
        BigDecimal height,
        BigDecimal weight,
        BigDecimal bmi,
        String leftVision,
        String rightVision,

        boolean labImagingEnabled,
        BigDecimal fbsGlucoseMgDl,
        BigDecimal fbsGlucoseMmolL,
        LocalDate fbsDatePerformed,

        UUID createdById,
        String createdByUsername,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static TriageResponse from(EncounterTriage t) {
        return new TriageResponse(
                t.getEncounterId(),
                t.getSystolic(),
                t.getDiastolic(),
                t.getHeartRate(),
                t.getRespiratoryRate(),
                t.getTemperature(),
                t.getHeight(),
                t.getWeight(),
                t.getBmi(),
                t.getLeftVision(),
                t.getRightVision(),
                t.isLabImagingEnabled(),
                t.getFbsGlucoseMgDl(),
                t.getFbsGlucoseMmolL(),
                t.getFbsDatePerformed(),
                t.getCreatedBy() == null ? null : t.getCreatedBy().getId(),
                t.getCreatedBy() == null ? null : t.getCreatedBy().getUsername(),
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }
}