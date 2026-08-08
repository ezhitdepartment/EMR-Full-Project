package com.ezarate.hospital.modules.encounter.dto;

import com.ezarate.hospital.modules.encounter.entity.EncounterWaiver;

import java.time.LocalDate;

public record WaiverResponse(
        String encounterId,
        boolean signed,
        String signedBy,
        String relationship,
        LocalDate waiverDate,
        String reason
) {
    public static WaiverResponse from(EncounterWaiver w) {
        return new WaiverResponse(
                w.getEncounterId(),
                w.isSigned(),
                w.getSignedBy(),
                w.getRelationship(),
                w.getWaiverDate(),
                w.getReason()
        );
    }
}