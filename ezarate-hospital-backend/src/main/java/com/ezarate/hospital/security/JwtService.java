package com.ezarate.hospital.security;

import com.ezarate.hospital.modules.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secretString;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    private SecretKey key;

    @PostConstruct
    void init() {
        if (secretString == null || secretString.isBlank()) {
            throw new IllegalStateException(
                "app.jwt.secret is not set. Set JWT_SECRET as an environment variable " +
                "(or app.jwt.secret in your active application-*.yml profile) before starting the app."
            );
        }
        // HS256 requires a key of at least 256 bits (32 bytes) — jjwt throws
        // a clear error itself if it's too short, this just fails fast.
        this.key = Keys.hmacShaKeyFor(secretString.getBytes());
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("username", user.getUsername())
                .claim("role", user.getRole())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    /** Throws io.jsonwebtoken.JwtException (expired, malformed, bad signature, etc.) if invalid. */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
