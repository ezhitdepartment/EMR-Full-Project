package com.ezarate.hospital.modules.medicineprescription.service;

import com.ezarate.hospital.common.exception.NotDeletableException;
import com.ezarate.hospital.modules.encounter.entity.Encounter;
import com.ezarate.hospital.modules.encounter.exception.EncounterNotFoundException;
import com.ezarate.hospital.modules.encounter.repository.EncounterRepository;
import com.ezarate.hospital.modules.medicineprescription.dto.MedicinePrescriptionRequest;
import com.ezarate.hospital.modules.medicineprescription.dto.MedicinePrescriptionResponse;
import com.ezarate.hospital.modules.medicineprescription.dto.PrescriptionItemDto;
import com.ezarate.hospital.modules.medicineprescription.entity.MedicinePrescription;
import com.ezarate.hospital.modules.medicineprescription.entity.PrescriptionItem;
import com.ezarate.hospital.modules.medicineprescription.exception.MedicinePrescriptionNotFoundException;
import com.ezarate.hospital.modules.medicineprescription.repository.MedicinePrescriptionRepository;
import com.ezarate.hospital.modules.medicineprescription.repository.PrescriptionItemRepository;
import com.ezarate.hospital.modules.patient.entity.Patient;
import com.ezarate.hospital.modules.patient.exception.PatientNotFoundException;
import com.ezarate.hospital.modules.patient.repository.PatientRepository;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MedicinePrescriptionService {

    private final MedicinePrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository itemRepository;
    private final PatientRepository patientRepository;
    private final EncounterRepository encounterRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    @PersistenceContext
    private EntityManager entityManager;

    public MedicinePrescriptionService(
            MedicinePrescriptionRepository prescriptionRepository,
            PrescriptionItemRepository itemRepository,
            PatientRepository patientRepository,
            EncounterRepository encounterRepository,
            UserRepository userRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.prescriptionRepository = prescriptionRepository;
        this.itemRepository = itemRepository;
        this.patientRepository = patientRepository;
        this.encounterRepository = encounterRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    // ------------------------------------------------------------------
    // Create / upsert
    // ------------------------------------------------------------------

    @Transactional
    public MedicinePrescriptionResponse create(MedicinePrescriptionRequest request) {
        Patient patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> new PatientNotFoundException(request.patientId()));

        Encounter encounter = null;
        if (request.encounterId() != null && !request.encounterId().isBlank()) {
            encounter = encounterRepository.findById(request.encounterId())
                    .orElseThrow(() -> new EncounterNotFoundException(request.encounterId()));
        }

        MedicinePrescription rx = MedicinePrescription.builder()
                .id(generateId())
                .patient(patient)
                .encounter(encounter)
                .prescribedBy(request.prescribedBy())
                .build();
        Optional<UUID> currentUserId = currentUserProvider.currentUserId();
        if (currentUserId.isPresent()) {
            rx.setCreatedBy(userRepository.getReferenceById(currentUserId.get()));
        }
        rx = prescriptionRepository.save(rx);

        addItems(rx, request.items());

        entityManager.flush();
        entityManager.refresh(rx);
        return MedicinePrescriptionResponse.from(rx);
    }

    // Backs upsertMedicinePrescriptionForEncounter(): "one prescription per
    // registration" — re-submitting the Add Prescription page for the same
    // visit replaces the prescribing physician + fully replaces the line
    // items instead of stacking a duplicate prescription. Unlike
    // lab_order_tests, line items carry no independent per-item state a
    // tech could have already acted on, so a full delete-and-reinsert is
    // the simplest, safest sync (same reasoning the original SQL migration
    // used).
    @Transactional
    public MedicinePrescriptionResponse upsertForEncounter(String encounterId, MedicinePrescriptionRequest request) {
        if (encounterId == null || encounterId.isBlank()) {
            return create(request);
        }
        // Make sure the encounter itself exists / is addressable up front,
        // same as create() does, even though we may not use `encounter`
        // directly below (findByEncounterId already scopes by id).
        encounterRepository.findById(encounterId)
                .orElseThrow(() -> new EncounterNotFoundException(encounterId));

        Optional<MedicinePrescription> existing = prescriptionRepository.findByEncounterId(encounterId);
        if (existing.isEmpty()) {
            return create(new MedicinePrescriptionRequest(
                    request.patientId(), encounterId, request.prescribedBy(), request.items()));
        }

        MedicinePrescription rx = existing.get();
        rx.setPrescribedBy(request.prescribedBy());
        rx = prescriptionRepository.save(rx);

        // Full replace of line items.
        itemRepository.deleteAll(itemRepository.findByPrescriptionId(rx.getId()));
        addItems(rx, request.items());

        entityManager.flush();
        entityManager.refresh(rx);
        return MedicinePrescriptionResponse.from(rx);
    }

    private void addItems(MedicinePrescription rx, List<PrescriptionItemDto> items) {
        if (items == null) return;
        for (PrescriptionItemDto dto : items) {
            PrescriptionItem item = PrescriptionItem.builder()
                    .prescription(rx)
                    .medicineName(dto.medicineName())
                    .milligram(dto.milligram())
                    .quantity(dto.quantity() != null ? dto.quantity() : 1)
                    .instructions(dto.instructions())
                    .build();
            itemRepository.save(item);
        }
    }

    // ------------------------------------------------------------------
    // Read / search
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public MedicinePrescriptionResponse getById(String id) {
        return MedicinePrescriptionResponse.from(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public MedicinePrescriptionResponse getByEncounter(String encounterId) {
        return prescriptionRepository.findByEncounterId(encounterId)
                .map(MedicinePrescriptionResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<MedicinePrescriptionResponse> getHistoryByPatient(UUID patientId) {
        return prescriptionRepository.findByPatientIdOrderByDateCreatedDesc(patientId).stream()
                .map(MedicinePrescriptionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<MedicinePrescriptionResponse> search(String query, String status, Pageable pageable) {
        return prescriptionRepository.search(query, status, pageable).map(MedicinePrescriptionResponse::from);
    }

    // Backs the Encounters table's Medication column.
    @Transactional(readOnly = true)
    public List<String> getMedicineNamesForEncounter(String encounterId) {
        return prescriptionRepository.findMedicineNamesForEncounter(encounterId);
    }

    // ------------------------------------------------------------------
    // Cancel
    // ------------------------------------------------------------------

    // Same shape as Encounter's cancel(): flips status only, line items
    // are left exactly as prescribed so the record stays a true history.
    @Transactional
    public MedicinePrescriptionResponse cancel(String id) {
        MedicinePrescription rx = findOrThrow(id);
        rx.setStatus("CANCELLED");
        rx = prescriptionRepository.save(rx);
        return MedicinePrescriptionResponse.from(rx);
    }

    // Backs Archive.jsx's "Delete Permanently" button on the Archived
    // Medicine Prescriptions tab. Admin-only (see controller). Only
    // allowed once the prescription is already CANCELLED. Line items
    // cascade via CascadeType.ALL/orphanRemoval on
    // MedicinePrescription.items (and ON DELETE CASCADE at the DB level).
    @Transactional
    public void deletePermanently(String id) {
        MedicinePrescription rx = findOrThrow(id);
        if (!"CANCELLED".equals(rx.getStatus())) {
            throw new NotDeletableException("Only cancelled prescriptions can be permanently deleted.");
        }
        prescriptionRepository.delete(rx);
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    private MedicinePrescription findOrThrow(String id) {
        return prescriptionRepository.findById(id)
                .orElseThrow(() -> new MedicinePrescriptionNotFoundException(id));
    }

    // "MED-20260706-0012" — same atomic, race-safe Postgres function
    // encounters/lab_orders/consultations all use.
    private String generateId() {
        return (String) entityManager
                .createNativeQuery("SELECT generate_daily_sequence_id('MED-')")
                .getSingleResult();
    }
}