package com.ezarate.hospital.modules.user.repository;

import com.ezarate.hospital.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    default Optional<User> findByUsernameOrEmail(String usernameOrEmail) {
        return findByUsername(usernameOrEmail).or(() -> findByEmail(usernameOrEmail));
    }

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    /** Backs Roles.jsx's "All staff accounts" table. */
    List<User> findAllByOrderByCreatedAtDesc();

    /** Backs Archive.jsx's "Archived User Accounts" tab (loadArchivedAccounts() -> status = 'suspended'). */
    List<User> findAllByStatusOrderByCreatedAtDesc(String status);

    /**
     * Backs the Consultation Form's "Certification of Attending Health Care
     * Professional" section — lets the printed-name dropdown auto-fill the
     * License Number / PTR field from the doctor's own account instead of
     * requiring it to be re-typed for every consultation. Only active
     * doctor accounts are offered, same "no login = don't show up" rule
     * everything else in this table follows.
     */
    List<User> findAllByRoleAndStatusOrderByFirstNameAscLastNameAsc(String role, String status);
}