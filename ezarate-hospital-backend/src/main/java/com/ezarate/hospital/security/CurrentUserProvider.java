package com.ezarate.hospital.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * JwtAuthenticationFilter sets the request's Authentication principal to the
 * user's UUID directly (not a UserDetails/username) - see
 * SecurityContextHolder.getContext().setAuthentication(...) there. This is
 * the one place that assumption lives, so every module reads "who's making
 * this request" through here instead of re-deriving it from
 * SecurityContextHolder each time.
 */
@Component
public class CurrentUserProvider {

    public UUID requireCurrentUserId() {
        return currentUserId()
                .orElseThrow(() -> new IllegalStateException(
                        "No authenticated user in the current request context"));
    }

    public Optional<UUID> currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UUID id) {
            return Optional.of(id);
        }
        return Optional.empty();
    }

    /**
     * The calling user's role, lower-cased (e.g. "er_nurse"), read straight
     * back off the JWT's authorities — JwtAuthenticationFilter granted
     * "ROLE_<ROLE>" from the token's own "role" claim, so no extra DB
     * lookup is needed here. Used by modules (e.g. Encounters) that need
     * to reimplement the old RLS-style per-role visibility split in Java.
     */
    public Optional<String> currentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return Optional.empty();
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()).toLowerCase())
                .findFirst();
    }
}