package com.ezarate.hospital.modules.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    /**
     * One of: admin, doctor, er_nurse, opd_nurse, med_tech, xray_tech,
     * pharmacist, staff — matches src/data/roles.js ROLE_OPTIONS.
     * Kept as a plain String (not a Java enum) so adding a role is a
     * one-line DB constraint change, no redeploy required elsewhere.
     */
    @Column(nullable = false)
    private String role;

    @Builder.Default
    private String prefix = "";

    @Column(name = "first_name")
    @Builder.Default
    private String firstName = "";

    @Column(name = "last_name")
    @Builder.Default
    private String lastName = "";

    @Column(name = "license_number")
    @Builder.Default
    private String licenseNumber = "";

    /** Base64 data URL, same pattern the frontend already renders directly into an &lt;img&gt;. */
    private String photo;

    /** "active" or "suspended" — checked at login. */
    @Builder.Default
    private String status = "active";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
