package com.ezarate.hospital.modules.laborder.dto;

import com.ezarate.hospital.modules.laborder.entity.LabOrderTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record LabOrderTestResponse(
        UUID id,
        String testName,
        String code,
        String status,
        String queueStatus,
        String isReferred,
        String performedBy,
        LocalDate datePerformed,
        BigDecimal fee,
        String testDetail,
        String remarks
) {
    public static LabOrderTestResponse from(LabOrderTest t) {
        return new LabOrderTestResponse(
                t.getId(),
                t.getTestName(),
                t.getCode(),
                t.getStatus(),
                t.getQueueStatus(),
                t.getIsReferred(),
                t.getPerformedBy(),
                t.getDatePerformed(),
                t.getFee(),
                t.getTestDetail(),
                t.getRemarks()
        );
    }
}
