package com.ezarate.hospital.common.exception;

/**
 * Thrown by any "Delete Permanently" service method (Archive.jsx) when the
 * record targeted isn't actually in an archived/cancelled state yet — e.g.
 * trying to hard-delete a registration that's still PENDING/COMPLETED
 * instead of CANCELLED. Shared across modules (encounter, lab order,
 * medicine prescription, ...) instead of one copy-pasted exception class
 * per module, since the shape and handling are identical everywhere.
 */
public class NotDeletableException extends RuntimeException {
    public NotDeletableException(String message) {
        super(message);
    }
}
