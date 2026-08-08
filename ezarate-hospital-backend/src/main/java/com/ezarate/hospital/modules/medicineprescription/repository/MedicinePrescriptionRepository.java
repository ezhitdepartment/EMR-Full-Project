package com.ezarate.hospital.modules.medicineprescription.repository;

import com.ezarate.hospital.modules.medicineprescription.entity.MedicinePrescription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicinePrescriptionRepository extends JpaRepository<MedicinePrescription, String> {

    // "One prescription per registration" — uq_medicine_prescriptions_one_per_encounter.
    Optional<MedicinePrescription> findByEncounterId(String encounterId);

    List<MedicinePrescription> findByPatientIdOrderByDateCreatedDesc(UUID patientId);

    // Backs the Medicine Prescriptions list page's search box + status filter.
    @Query("""
        SELECT p FROM MedicinePrescription p
        WHERE (:status IS NULL OR :status = '' OR p.status = :status)
          AND (:query IS NULL OR :query = ''
               OR LOWER(p.patient.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(p.patient.lastName)  LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(p.patient.hospitalNo) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(p.id) LIKE LOWER(CONCAT('%', :query, '%')))
        ORDER BY p.dateCreated DESC
        """)
    Page<MedicinePrescription> search(
            @Param("query") String query,
            @Param("status") String status,
            Pageable pageable
    );

    // Backs the Encounters table's Medication column — every medicine name
    // prescribed under this exact registration.
    @Query("""
        SELECT DISTINCT i.medicineName FROM PrescriptionItem i
        WHERE i.prescription.encounter.id = :encounterId
        """)
    List<String> findMedicineNamesForEncounter(@Param("encounterId") String encounterId);
}
