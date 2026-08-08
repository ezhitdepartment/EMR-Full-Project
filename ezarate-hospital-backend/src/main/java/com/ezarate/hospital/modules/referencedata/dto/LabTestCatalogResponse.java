package com.ezarate.hospital.modules.referencedata.dto;

import com.ezarate.hospital.modules.laborder.entity.LabTestCatalog;

public record LabTestCatalogResponse(
        String testName,
        String formType,
        String category,
        String codePrefix
) {
    public static LabTestCatalogResponse from(LabTestCatalog c) {
        return new LabTestCatalogResponse(c.getTestName(), c.getFormType(), c.getCategory(), c.getCodePrefix());
    }
}
