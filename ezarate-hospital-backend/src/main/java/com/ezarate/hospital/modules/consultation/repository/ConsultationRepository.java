package com.ezarate.hospital.modules.consultation.repository;

import com.ezarate.hospital.modules.consultation.entity.Consultation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsultationRepository extends JpaRepository<Consultation, String> {

    Optional<Consultation> findByEncounterIdAndAuthorRole(String encounterId, String authorRole);

    /** Backs the "Consultations Authored" figure on UserProfilePage.jsx (getUserActivityStats()). */
    long countByAuthor_Id(UUID userId);

    /** Backs the "Patients Consulted" figure — distinct patients across all of this user's entries. */
    @Query("SELECT COUNT(DISTINCT c.patient.id) FROM Consultation c WHERE c.author.id = :userId")
    long countDistinctPatientsByAuthorId(@Param("userId") UUID userId);

    List<Consultation> findByPatientIdOrderByUpdatedAtDesc(UUID patientId);

    // Backs the "Recent Reports" / all-consultations view (utils/reports.js
    // equivalent) - every save, across every patient, newest-edited first.
    Page<Consultation> findAllByOrderByUpdatedAtDesc(Pageable pageable);

    // Backs the Registration table's Diagnosis column - one row per
    // encounter, newest-edited first, so ConsultationService can pick
    // "the first non-blank diagnosis per encounter" the same way
    // loadDiagnosesByEncounter() does on the frontend.
    List<Consultation> findByEncounterIdIsNotNullOrderByUpdatedAtDesc();

    // Backs the Admitted Patients list - only doctor-authored entries have
    // a Disposition value at all (it's a DOCTOR_SECTIONS field on the
    // Consultation Form), so author_role = 'doctor' is part of the filter,
    // not just disposition = 'Admitted'. Newest-edited first, same as
    // AdmittedPatientService needs before it dedupes down to one row per
    // patient.
    List<Consultation> findByAuthorRoleAndDispositionOrderByUpdatedAtDesc(String authorRole, String disposition);

    // consultations.encounter_id has no ON DELETE clause (unlike
    // lab_orders/medicine_prescriptions, which SET NULL) — used by
    // EncounterService.deletePermanently() to clear a cancelled
    // encounter's own consultation entries before hard-deleting the row
    // itself, so the FK doesn't block the delete.
    void deleteByEncounterId(String encounterId);
}