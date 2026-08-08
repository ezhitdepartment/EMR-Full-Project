package com.ezarate.hospital.modules.patientdocument.dto;

import com.ezarate.hospital.modules.patientdocument.entity.PatientDocument;

import java.time.OffsetDateTime;

public record PatientDocumentResponse(
        String hospitalNo,
        String docType,
        String data,
        OffsetDateTime updatedAt
) {
    public static PatientDocumentResponse from(PatientDocument d) {
        return new PatientDocumentResponse(d.getHospitalNo(), d.getDocType(), d.getData(), d.getUpdatedAt());
    }

    /** Used when no document exists yet for a (hospitalNo, docType) pair — the frontend gets an empty shell instead of a 404. */
    public static PatientDocumentResponse empty(String hospitalNo, String docType) {
        return new PatientDocumentResponse(hospitalNo, docType, "{}", null);
    }
}
