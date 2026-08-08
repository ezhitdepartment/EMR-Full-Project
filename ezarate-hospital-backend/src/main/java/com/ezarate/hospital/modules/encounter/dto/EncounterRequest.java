package com.ezarate.hospital.modules.encounter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EncounterRequest(
        @NotNull(message = "Appointment date is required")
        LocalDate appointmentDate,

        @NotBlank(message = "Consultation type is required")
        String consultationType,

        String reasonForVisiting,
        String doctor,
        BigDecimal fee,
        String paymentType,
        String photo,

        // "ER Patient" or "OPD Patient" — decided by the role of whoever's
        // registering. Defaults to "OPD Patient" if omitted, same as the
        // column's own DB default.
        String patientType,

        // Null on create() (new registrations always start false/default —
        // see EncounterService.applyRequest()'s null-coalescing). On
        // update(), the frontend always sends the full current+patched
        // value (read-modify-write), so these are never accidentally left
        // null there either. Flipping either *Done flag is what fires
        // trg_encounters_set_census_no — see V5__encounters.sql.
        Boolean nurseConsultationDone,
        Boolean doctorConsultationDone,
        String migratedStatus,
        String pcuStatus
) {}