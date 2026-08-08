package com.ezarate.hospital.modules.user.dto;

/** Matches getUserActivityStats()'s return shape exactly. */
public record UserActivityStatsResponse(
        long patientsCreated,
        long consultationsAuthored,
        long patientsConsulted
) {
}
