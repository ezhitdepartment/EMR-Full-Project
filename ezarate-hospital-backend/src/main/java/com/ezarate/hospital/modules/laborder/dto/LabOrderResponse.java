package com.ezarate.hospital.modules.laborder.dto;

import com.ezarate.hospital.modules.laborder.entity.LabOrder;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record LabOrderResponse(
        String id,
        String encounterId,
        UUID patientId,
        String hospitalNo,
        String patientFirstName,
        String patientLastName,
        String patientMiddleName,
        String patientSex,
        LocalDate patientDateOfBirth,
        String createdByUsername,
        OffsetDateTime dateCreated,
        List<LabOrderTestResponse> tests,
        // One shared upload area per order now, not per diagnostic test —
        // see V15__lab_order_files_per_order.sql.
        List<LabOrderFileResponse> files
) {
    public static LabOrderResponse from(LabOrder o) {
        var p = o.getPatient();
        return new LabOrderResponse(
                o.getId(),
                o.getEncounter() != null ? o.getEncounter().getId() : null,
                p.getId(),
                p.getHospitalNo(),
                p.getFirstName(),
                p.getLastName(),
                p.getMiddleName(),
                p.getSex(),
                p.getDateOfBirth(),
                o.getCreatedBy() != null ? o.getCreatedBy().getUsername() : null,
                o.getDateCreated(),
                o.getTests().stream().map(LabOrderTestResponse::from).toList(),
                o.getFiles().stream().map(LabOrderFileResponse::from).toList()
        );
    }
}
