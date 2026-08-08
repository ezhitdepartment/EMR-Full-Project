package com.ezarate.hospital.modules.patientdocument.exception;

import java.util.Set;

public class InvalidDocTypeException extends RuntimeException {

    public static final Set<String> VALID_DOC_TYPES = Set.of(
            "emr", "discharge", "konsulta", "medcert", "medabstract", "admitdischarge"
    );

    public InvalidDocTypeException(String docType) {
        super("Unknown document type '" + docType + "'. Must be one of " + VALID_DOC_TYPES);
    }

    public static void validate(String docType) {
        if (!VALID_DOC_TYPES.contains(docType)) {
            throw new InvalidDocTypeException(docType);
        }
    }
}
