package com.ezarate.hospital.modules.medicineprescription.dto;

import com.ezarate.hospital.modules.medicineprescription.entity.MedicinePrescription;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record MedicinePrescriptionResponse(
        String id,
        String encounterId,
        UUID patientId,
        String hospitalNo,
        String patientFirstName,
        String patientLastName,
        String patientMiddleName,
        String patientSex,
        LocalDate patientDateOfBirth,
        String patientAddress,
        String prescribedBy,
        String status,
        List<PrescriptionItemDto> items,
        OffsetDateTime dateCreated
) {
    public static MedicinePrescriptionResponse from(MedicinePrescription rx) {
        var p = rx.getPatient();
        return new MedicinePrescriptionResponse(
                rx.getId(),
                rx.getEncounter() != null ? rx.getEncounter().getId() : null,
                p.getId(),
                p.getHospitalNo(),
                p.getFirstName(),
                p.getLastName(),
                p.getMiddleName(),
                p.getSex(),
                p.getDateOfBirth(),
                p.getAddress(),
                rx.getPrescribedBy(),
                rx.getStatus(),
                rx.getItems().stream().map(PrescriptionItemDto::from).toList(),
                rx.getDateCreated()
        );
    }
}
