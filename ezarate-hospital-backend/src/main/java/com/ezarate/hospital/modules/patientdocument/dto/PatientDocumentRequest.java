package com.ezarate.hospital.modules.patientdocument.dto;

import jakarta.validation.constraints.NotBlank;

/** data is a raw JSON string — the frontend owns the shape per doc_type, backend just stores it. */
public record PatientDocumentRequest(
        @NotBlank(message = "data is required") String data
) {}
