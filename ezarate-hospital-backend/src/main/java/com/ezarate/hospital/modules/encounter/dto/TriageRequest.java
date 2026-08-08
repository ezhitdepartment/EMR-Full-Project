package com.ezarate.hospital.modules.encounter.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TriageRequest(
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

        Boolean labImagingEnabled,
        BigDecimal fbsGlucoseMgDl,
        BigDecimal fbsGlucoseMmolL,
        LocalDate fbsDatePerformed
) {}