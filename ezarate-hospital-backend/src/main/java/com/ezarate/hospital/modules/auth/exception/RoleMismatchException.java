package com.ezarate.hospital.modules.auth.exception;

public class RoleMismatchException extends RuntimeException {
    public RoleMismatchException() {
        super("This account isn't registered under the selected role.");
    }
}
