package com.ezarate.hospital.modules.encounter.repository;

import com.ezarate.hospital.modules.encounter.entity.Encounter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface EncounterRepository extends JpaRepository<Encounter, String> {

    // Backs the Patient Profile's Encounters/Registration panel — every
    // registration for one patient, newest first.
    List<Encounter> findByPatientIdOrderByDateCreatedDesc(UUID patientId);

    /**
     * Backs the Registrations/Encounters list page's search box + filters.
     * Mirrors the RLS split ER/OPD nurses used to get from
     * current_user_can_access_patient_type(): pass restrictToPatientType =
     * null for roles with unrestricted visibility (admin, doctor,
     * med_tech, xray_tech, pharmacist, staff), or a single value
     * ("ER Patient" / "OPD Patient") to scope an er_nurse/opd_nurse to
     * only their own type. Kept as a single nullable String rather than a
     * List parameter — Hibernate handles "param IS NULL" cleanly, but
     * binding a null/empty collection to an IN(...) clause is a common
     * source of provider-specific breakage, and a role is only ever
     * scoped to exactly one patientType in practice anyway.
     */
    @Query("""
        SELECT e FROM Encounter e
        WHERE (:restrictToPatientType IS NULL OR e.patientType = :restrictToPatientType)
          AND (:status IS NULL OR :status = '' OR e.status = :status)
          AND (:patientType IS NULL OR :patientType = '' OR e.patientType = :patientType)
          AND (:query IS NULL OR :query = ''
               OR LOWER(e.patient.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(e.patient.lastName)  LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CONCAT(e.patient.firstName, ' ', e.patient.lastName)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(e.patient.hospitalNo) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(e.id) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(COALESCE(e.censusNo, '')) LIKE LOWER(CONCAT('%', :query, '%')))
        ORDER BY e.dateCreated DESC
        """)
    Page<Encounter> search(
            @Param("query") String query,
            @Param("status") String status,
            @Param("patientType") String patientType,
            @Param("restrictToPatientType") String restrictToPatientType,
            Pageable pageable
    );
}