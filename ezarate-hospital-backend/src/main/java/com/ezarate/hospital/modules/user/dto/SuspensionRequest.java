package com.ezarate.hospital.modules.user.dto;

/** Matches setAccountSuspension(targetUserId, suspend) on the frontend. */
public record SuspensionRequest(boolean suspend) {
}
