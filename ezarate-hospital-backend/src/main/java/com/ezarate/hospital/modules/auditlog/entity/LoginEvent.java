package com.ezarate.hospital.modules.auditlog.entity;

import com.ezarate.hospital.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

// Fields are copied in at the moment of login, not joined from `users` at
// read time — if an admin changes someone's role next week, last month's
// login rows still correctly show the role they had at the time.
@Entity
@Table(name = "login_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String role;

    @Builder.Default
    private String prefix = "";

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    private String email;

    @Column(name = "license_number")
    @Builder.Default
    private String licenseNumber = "";

    @Column(name = "logged_in_at", insertable = false, updatable = false)
    private OffsetDateTime loggedInAt;
}
