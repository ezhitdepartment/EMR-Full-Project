package com.ezarate.hospital.modules.user.exception;

/**
 * Safety net that didn't exist in the old RLS-only setup: nothing stopped
 * an admin from suspending or deleting their own account via a raw Supabase
 * update/Edge Function call. Since this is a brand-new guard (not a ported
 * behavior), it's isolated in its own exception so it's easy to find and
 * remove later if it turns out to be unwanted.
 */
public class CannotModifySelfException extends RuntimeException {
    public CannotModifySelfException(String message) {
        super(message);
    }
}
