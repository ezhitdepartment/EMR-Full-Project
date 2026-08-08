package com.ezarate.hospital.modules.encounter.dto;

import java.time.LocalDate;

public record WaiverRequest(
        boolean signed,
        String signedBy,
        String relationship,
        LocalDate waiverDate,
        String reason
) {}