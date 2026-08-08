package com.ezarate.hospital.modules.referencedata.dto;

import com.ezarate.hospital.modules.user.entity.User;

/**
 * Name + license number for an active doctor account. Backs the
 * Consultation Form's Certification section so choosing a doctor in the
 * "Printed Name of Attending Health Care Professional" dropdown can
 * auto-fill "License Number / PTR" from that doctor's own account instead
 * of it being retyped by hand every time.
 */
public record DoctorDirectoryEntry(String name, String licenseNumber) {

    public static DoctorDirectoryEntry from(User user) {
        String name = String.join(" ", user.getPrefix(), user.getFirstName(), user.getLastName())
                .trim()
                .replaceAll("\\s+", " ");
        return new DoctorDirectoryEntry(name, user.getLicenseNumber());
    }
}
