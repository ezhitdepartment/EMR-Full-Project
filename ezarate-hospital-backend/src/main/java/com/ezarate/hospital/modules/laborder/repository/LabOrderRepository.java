package com.ezarate.hospital.modules.laborder.repository;

import com.ezarate.hospital.modules.laborder.entity.LabOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LabOrderRepository extends JpaRepository<LabOrder, String> {

    // "One lab order per registration" — uq_lab_orders_one_per_encounter.
    // Used by upsertForEncounter() to find the existing order for a visit
    // instead of always inserting a new one.
    Optional<LabOrder> findByEncounterId(String encounterId);

    /**
     * Backs the Lab Orders / X-Ray Orders list pages. formType filters via
     * a join to lab_test_catalog so a med_tech/xray_tech's list only ever
     * shows orders that actually contain at least one test in their scope
     * — mirrors current_user_can_access_form_type() from RLS. Pass
     * restricted = false for unrestricted roles (admin, nurses,
     * doctor) — formTypes is then never evaluated, so it can be an empty
     * list in that case (binding a null List to an IN(...) clause is a
     * common source of provider-specific breakage; an always-non-null,
     * possibly-empty list sidesteps that entirely).
     */
    @Query("""
        SELECT DISTINCT o FROM LabOrder o
        LEFT JOIN o.tests t
        WHERE (:restricted = false
               OR t.testName IN (SELECT c.testName FROM LabTestCatalog c WHERE c.formType IN :formTypes))
          AND (:query IS NULL OR :query = ''
               OR LOWER(o.patient.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(o.patient.lastName)  LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(o.patient.hospitalNo) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(o.id) LIKE LOWER(CONCAT('%', :query, '%')))
        ORDER BY o.dateCreated DESC
        """)
    Page<LabOrder> search(
            @Param("query") String query,
            @Param("restricted") boolean restricted,
            @Param("formTypes") java.util.List<String> formTypes,
            Pageable pageable
    );

    java.util.List<LabOrder> findByPatientIdOrderByDateCreatedDesc(UUID patientId);
}
