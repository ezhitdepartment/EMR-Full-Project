package com.ezarate.hospital.modules.patient.repository;

import com.ezarate.hospital.modules.patient.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByHospitalNo(String hospitalNo);

    /** Backs the "Patients Created" figure on UserProfilePage.jsx (getUserActivityStats()). */
    long countByCreatedBy_Id(UUID userId);

    /**
     * Same-identity check CreatePatientModal.jsx runs before insert: exact
     * (case-insensitive) first+last name AND exact date of birth. Narrower
     * on purpose than search() above — a fuzzy match here would false-
     * positive on partial name overlaps and block a legitimate new patient.
     */
    @Query("""
        SELECT p FROM Patient p
        WHERE LOWER(p.firstName) = LOWER(:firstName)
          AND LOWER(p.lastName) = LOWER(:lastName)
          AND p.dateOfBirth = :dateOfBirth
        """)
    List<Patient> findDuplicates(
            @Param("firstName") String firstName,
            @Param("lastName") String lastName,
            @Param("dateOfBirth") LocalDate dateOfBirth
    );

    /**
     * Matches the Patients list page's search box: by first/last name
     * (either order) or hospital number. Case-insensitive, partial match.
     */
    @Query("""
        SELECT p FROM Patient p
        WHERE (:query IS NULL OR :query = ''
               OR LOWER(p.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(p.lastName)  LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CONCAT(p.firstName, ' ', p.lastName)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(p.hospitalNo) LIKE LOWER(CONCAT('%', :query, '%')))
        ORDER BY p.lastName, p.firstName
        """)
    Page<Patient> search(@Param("query") String query, Pageable pageable);
}