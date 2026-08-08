package com.ezarate.hospital.config;

import com.ezarate.hospital.modules.user.entity.User;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    // Change this immediately after first login — there's no "force password
    // change on first login" flow yet, so this is on the honor system for now.
    private static final String DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return; // already seeded, or real accounts exist — never touch an existing DB
        }

        User admin = User.builder()
                .username("Admin")
                .email("admin@ezaratehospital.ph")
                .passwordHash(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD))
                .role("admin")
                .firstName("Admin")
                .lastName("")
                .status("active")
                .build();

        userRepository.save(admin);

        log.warn("=================================================================");
        log.warn(" No users found — seeded a default admin account:");
        log.warn("   username: Admin");
        log.warn("   password: {}", DEFAULT_ADMIN_PASSWORD);
        log.warn(" Log in and change this password immediately.");
        log.warn("=================================================================");
    }
}
