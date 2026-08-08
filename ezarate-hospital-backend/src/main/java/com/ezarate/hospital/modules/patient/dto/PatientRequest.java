package com.ezarate.hospital.modules.patient.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDate;

public record PatientRequest(
        @NotBlank(message = "First name is required") String firstName,
        @NotBlank(message = "Last name is required") String lastName,
        String middleName,
        String suffix,

        @NotBlank(message = "Sex is required") String sex,

        @NotNull(message = "Date of birth is required")
        @Past(message = "Date of birth must be in the past")
        LocalDate dateOfBirth,

        String email,
        String landline,
        String mobile,

        boolean hasGuardian,
        @Valid GuardianDto guardian,

        @NotBlank(message = "Address is required") String address,
        String region,
        String regionCode,
        String province,
        String provinceCode,
        String city,
        String cityCode,
        String barangay,
        String zipCode,

        String motherName,
        String motherContact,
        String fatherName,
        String fatherContact,
        String nationality,
        String religion,
        String maritalStatus,

        String emergencyName,
        String emergencyAddress,
        String emergencyRelationship,
        String emergencyPhoneHome,
        String emergencyPhoneCell,

        String konsultaEligibility,
        String photo
) {}
