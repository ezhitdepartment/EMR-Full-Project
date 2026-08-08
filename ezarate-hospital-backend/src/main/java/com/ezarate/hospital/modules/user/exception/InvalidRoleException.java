package com.ezarate.hospital.modules.user.exception;

/** Matches src/data/roles.js's ROLE_OPTIONS — thrown when `role` isn't one of the 8 known values. */
public class InvalidRoleException extends RuntimeException {
    public InvalidRoleException(String role) {
        super("role must be one of admin, doctor, er_nurse, opd_nurse, med_tech, xray_tech, "
                + "pharmacist, staff — got \"" + role + "\"");
    }
}
