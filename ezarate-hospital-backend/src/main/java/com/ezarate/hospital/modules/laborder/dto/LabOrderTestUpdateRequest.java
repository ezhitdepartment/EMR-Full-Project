package com.ezarate.hospital.modules.laborder.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Patches a single test line on an order — status, queueStatus,
 * performedBy, results/remarks, etc. Every field is nullable/optional;
 * only non-null fields are applied (see LabOrderService#updateTest), so a
 * caller can send just {"status": "DONE"} without clobbering the rest.
 */
public record LabOrderTestUpdateRequest(
        String status,
        String queueStatus,
        String isReferred,
        String performedBy,
        LocalDate datePerformed,
        BigDecimal fee,
        String remarks,
        String testDetail
) {
}
