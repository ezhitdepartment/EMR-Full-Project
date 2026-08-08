package com.ezarate.hospital.modules.user.exception;

/**
 * Thrown when the adminUsername/adminPassword a DeleteAccountModal submitted
 * don't match the CALLING admin's own credentials (never checked against
 * the target account) — the step-up confirmation failed.
 */
public class InvalidAdminConfirmationException extends RuntimeException {
    public InvalidAdminConfirmationException() {
        super("Incorrect username or password.");
    }
}
