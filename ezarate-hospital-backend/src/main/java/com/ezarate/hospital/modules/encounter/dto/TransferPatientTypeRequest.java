package com.ezarate.hospital.modules.encounter.dto;

import jakarta.validation.constraints.NotBlank;

/** "ER Patient" or "OPD Patient" — the type to transfer this registration to. */
public record TransferPatientTypeRequest(
        @NotBlank(message = "patientType is required")
        String patientType
) {}