package com.ezarate.hospital.modules.patient.dto;

import com.ezarate.hospital.modules.patient.entity.Patient;
import com.ezarate.hospital.modules.patient.entity.PatientGuardian;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PatientResponse(
        UUID id,
        String hospitalNo,
        String firstName,
        String lastName,
        String middleName,
        String suffix,
        String sex,
        LocalDate dateOfBirth,
        String email,
        String landline,
        String mobile,
        boolean hasGuardian,
        GuardianDto guardian,
        String address,
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
        String photo,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static PatientResponse from(Patient p, PatientGuardian g) {
        GuardianDto guardianDto = g == null ? null : new GuardianDto(
                g.getFirstName(), g.getLastName(), g.getMiddleName(), g.getSuffix(),
                g.getSex(), g.getDateOfBirth(), g.getPin(), g.getLandline(), g.getMobile()
        );

        return new PatientResponse(
                p.getId(), p.getHospitalNo(), p.getFirstName(), p.getLastName(), p.getMiddleName(),
                p.getSuffix(), p.getSex(), p.getDateOfBirth(), p.getEmail(), p.getLandline(), p.getMobile(),
                p.isHasGuardian(), guardianDto,
                p.getAddress(), p.getRegion(), p.getRegionCode(), p.getProvince(), p.getProvinceCode(),
                p.getCity(), p.getCityCode(), p.getBarangay(), p.getZipCode(),
                p.getMotherName(), p.getMotherContact(), p.getFatherName(), p.getFatherContact(),
                p.getNationality(), p.getReligion(), p.getMaritalStatus(),
                p.getEmergencyName(), p.getEmergencyAddress(), p.getEmergencyRelationship(),
                p.getEmergencyPhoneHome(), p.getEmergencyPhoneCell(),
                p.getKonsultaEligibility(), p.getPhoto(),
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
