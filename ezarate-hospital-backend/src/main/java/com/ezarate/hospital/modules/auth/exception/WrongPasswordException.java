package com.ezarate.hospital.modules.auth.exception;

public class WrongPasswordException extends RuntimeException {
    public WrongPasswordException() {
        super("Old password is incorrect.");
    }
}
