package com.ezarate.hospital.modules.auth.exception;

public class AccountSuspendedException extends RuntimeException {
    public AccountSuspendedException() {
        super("This account has been suspended. Contact an admin.");
    }
}
