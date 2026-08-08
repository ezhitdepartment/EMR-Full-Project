package com.ezarate.hospital.modules.medicineprescription.dto;

import com.ezarate.hospital.modules.medicineprescription.entity.PrescriptionItem;
import jakarta.validation.constraints.NotBlank;

public record PrescriptionItemDto(
        @NotBlank String medicineName,
        String milligram,
        Integer quantity,
        String instructions
) {
    public static PrescriptionItemDto from(PrescriptionItem item) {
        return new PrescriptionItemDto(item.getMedicineName(), item.getMilligram(), item.getQuantity(), item.getInstructions());
    }
}
