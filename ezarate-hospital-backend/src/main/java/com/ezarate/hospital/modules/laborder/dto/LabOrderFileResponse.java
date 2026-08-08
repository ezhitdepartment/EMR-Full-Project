package com.ezarate.hospital.modules.laborder.dto;

import com.ezarate.hospital.modules.laborder.entity.LabOrderFile;

import java.time.OffsetDateTime;
import java.util.UUID;

public record LabOrderFileResponse(
        UUID id,
        String name,
        String storagePath,
        OffsetDateTime uploadedAt
) {
    public static LabOrderFileResponse from(LabOrderFile f) {
        return new LabOrderFileResponse(f.getId(), f.getFileName(), f.getStoragePath(), f.getUploadedAt());
    }
}
