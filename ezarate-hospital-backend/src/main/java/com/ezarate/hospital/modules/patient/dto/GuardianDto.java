package com.ezarate.hospital.modules.patient.dto;

import java.time.LocalDate;

public record GuardianDto(
        String firstName,
        String lastName,
        String middleName,
        String suffix,
        String sex,
        LocalDate dateOfBirth,
        String pin,
        String landline,
        String mobile
) {}
