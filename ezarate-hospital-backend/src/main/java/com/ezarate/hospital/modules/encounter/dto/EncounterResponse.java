package com.ezarate.hospital.modules.encounter.dto;

import com.ezarate.hospital.modules.encounter.entity.Encounter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EncounterResponse(
        String id,
        UUID patientId,
        String hospitalNo,
        String patientFirstName,
        String patientLastName,

        LocalDate appointmentDate,
        String consultationType,
        String reasonForVisiting,
        String doctor,
        BigDecimal fee,
        String paymentType,
        String photo,

        String patientType,
        String status,
        boolean nurseConsultationDone,
        boolean doctorConsultationDone,
        String censusNo,

        String migratedStatus,
        String pcuStatus,

        UUID createdById,
        String createdByUsername,
        OffsetDateTime dateCreated
) {
    public static EncounterResponse from(Encounter e) {
        return new EncounterResponse(
                e.getId(),
                e.getPatient().getId(),
                e.getPatient().getHospitalNo(),
                e.getPatient().getFirstName(),
                e.getPatient().getLastName(),
                e.getAppointmentDate(),
                e.getConsultationType(),
                e.getReasonForVisiting(),
                e.getDoctor(),
                e.getFee(),
                e.getPaymentType(),
                e.getPhoto(),
                e.getPatientType(),
                e.getStatus(),
                e.isNurseConsultationDone(),
                e.isDoctorConsultationDone(),
                e.getCensusNo(),
                e.getMigratedStatus(),
                e.getPcuStatus(),
                e.getCreatedBy() == null ? null : e.getCreatedBy().getId(),
                e.getCreatedBy() == null ? null : e.getCreatedBy().getUsername(),
                e.getDateCreated()
        );
    }
}