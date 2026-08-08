package com.ezarate.hospital.modules.consultation.service;

import com.ezarate.hospital.modules.consultation.dto.ConsultationRequest;
import com.ezarate.hospital.modules.consultation.dto.ConsultationResponse;
import com.ezarate.hospital.modules.consultation.entity.Consultation;
import com.ezarate.hospital.modules.consultation.exception.InvalidAuthorRoleException;
import com.ezarate.hospital.modules.consultation.repository.ConsultationRepository;
import com.ezarate.hospital.modules.encounter.entity.Encounter;
import com.ezarate.hospital.modules.encounter.repository.EncounterRepository;
import com.ezarate.hospital.modules.patient.entity.Patient;
import com.ezarate.hospital.modules.patient.exception.PatientNotFoundException;
import com.ezarate.hospital.modules.patient.repository.PatientRepository;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ConsultationService {

    // Matches the DB CHECK constraint on consultations.author_role
    // (chk_consultations_author_role) and the frontend's own
    // VALID_AUTHOR_ROLES in utils/consultations.js.
    private static final List<String> VALID_AUTHOR_ROLES = List.of("er_nurse", "opd_nurse", "doctor", "admin");

    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final EncounterRepository encounterRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    public ConsultationService(
            ConsultationRepository consultationRepository,
            PatientRepository patientRepository,
            UserRepository userRepository,
            EncounterRepository encounterRepository,
            CurrentUserProvider currentUserProvider,
            ObjectMapper objectMapper
    ) {
        this.consultationRepository = consultationRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.encounterRepository = encounterRepository;
        this.currentUserProvider = currentUserProvider;
        this.objectMapper = objectMapper;
    }

    // Mirrors saveConsultationEntry() in the frontend's utils/consultations.js:
    // one row per (encounter_id, author_role) - a re-save UPDATEs the
    // existing row instead of stacking a new one. Entries saved with no
    // encounterId (the standalone Patient Profile "Add/Update consultation"
    // shortcut) always insert a fresh row instead, since there's no
    // registration to key an update on.
    @Transactional
    public ConsultationResponse save(UUID patientId, ConsultationRequest request) {
        if (!VALID_AUTHOR_ROLES.contains(request.authorRole())) {
            throw new InvalidAuthorRoleException(request.authorRole(), VALID_AUTHOR_ROLES);
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException(patientId));

        Consultation consultation = null;
        if (request.encounterId() != null) {
            consultation = consultationRepository
                    .findByEncounterIdAndAuthorRole(request.encounterId(), request.authorRole())
                    .orElse(null);
        }

        boolean isNew = consultation == null;
        if (isNew) {
            consultation = new Consultation();
            consultation.setId(generateId());
            consultation.setPatient(patient);
            consultation.setEncounterId(request.encounterId());
            consultation.setAuthorRole(request.authorRole());

            final Consultation newConsultation = consultation;
            currentUserProvider.currentUserId()
                    .ifPresent(userId -> newConsultation.setAuthor(userRepository.getReferenceById(userId)));
        }

        applyRequest(consultation, request);
        consultation = consultationRepository.save(consultation);

        // created_at/updated_at are DB-generated (insertable=false,
        // updatable=false - created_at defaults on INSERT, updated_at is
        // bumped by the trg_consultations_updated_at trigger on UPDATE).
        // Same fix as PatientService.create(): without this, the entity
        // still holds whatever it had before save() - null on a fresh
        // insert - because Hibernate's first-level cache hands back the
        // same in-memory object instead of re-querying Postgres.
        entityManager.flush();
        entityManager.refresh(consultation);

        // If this save is tied to a registration, flip the corresponding
        // done-flag on `encounters` so the DB trigger
        // (trg_encounters_set_census_no) can assign a Census No.
        if (request.encounterId() != null) {
            markEncounterConsultationDone(request.encounterId(), request.authorRole());
        }

        return toResponse(consultation);
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> getHistoryByPatient(UUID patientId) {
        return consultationRepository.findByPatientIdOrderByUpdatedAtDesc(patientId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ConsultationResponse> getAll(Pageable pageable) {
        return consultationRepository.findAllByOrderByUpdatedAtDesc(pageable)
                .map(this::toResponse);
    }

    // Mirrors loadDiagnosesByEncounter() in utils/consultations.js: one
    // diagnosis string per encounter, keyed by encounterId, for the
    // Registration table's Diagnosis column. Rows are already fetched
    // newest-edited-first, so the first non-blank diagnosis seen for a
    // given encounter is already the most recent one.
    @Transactional(readOnly = true)
    public Map<String, String> getDiagnosesByEncounter() {
        Map<String, String> byEncounter = new LinkedHashMap<>();
        for (Consultation c : consultationRepository.findByEncounterIdIsNotNullOrderByUpdatedAtDesc()) {
            if (byEncounter.containsKey(c.getEncounterId())) continue;
            String text = formatDiagnosisText(c.getDiagnosis(), parseDetails(c.getDetails()));
            if (text != null && !text.isBlank()) {
                byEncounter.put(c.getEncounterId(), text);
            }
        }
        return byEncounter;
    }

    private void applyRequest(Consultation c, ConsultationRequest r) {
        c.setChiefComplaint(r.chiefComplaint());
        c.setHistoryOfPresentIllness(r.historyOfPresentIllness());
        c.setDiagnosis(r.diagnosis());
        c.setMedicationOrders(r.medicationOrders());
        c.setDisposition(r.disposition());
        c.setDispositionNotes(r.dispositionNotes());
        c.setAllergies(r.allergies());
        c.setBloodType(r.bloodType());
        c.setAdmittingDiagnosis(r.admittingDiagnosis());
        c.setDischargeDiagnosis(r.dischargeDiagnosis());
        c.setCaseRateCode1(r.caseRateCode1());
        c.setCaseRateCode2(r.caseRateCode2());
        c.setDateAdmitted(r.dateAdmitted());
        c.setDateDischarged(r.dateDischarged());
        c.setOutcomeOfTreatment(r.outcomeOfTreatment());
        c.setDetails(toJson(r.details()));
    }

    // "CONS-20260706-0018" - calls the same atomic, race-safe Postgres
    // function encounters/lab_orders/medicine_prescriptions already use
    // (see generate_daily_sequence_id() in V3__id_generator_infra.sql),
    // rather than reimplementing the counter logic in Java.
    private String generateId() {
        return (String) entityManager
                .createNativeQuery("SELECT generate_daily_sequence_id('CONS-')")
                .getSingleResult();
    }

    // Now that the Encounter module exists, this is a plain JPA
    // read-modify-save through EncounterRepository instead of a native
    // SQL UPDATE - Hibernate's own UPDATE still goes through
    // trg_encounters_set_census_no exactly the same way a native query
    // would, since the trigger lives on the table, not on any particular
    // client.
    private void markEncounterConsultationDone(String encounterId, String authorRole) {
        Encounter encounter = encounterRepository.findById(encounterId).orElse(null);
        if (encounter == null) {
            // The encounter this consultation references doesn't exist
            // (or was deleted) - nothing to flip, and failing the
            // consultation save over it would be worse than silently
            // skipping this side-effect.
            return;
        }

        switch (authorRole) {
            case "er_nurse", "opd_nurse" -> encounter.setNurseConsultationDone(true);
            case "doctor" -> encounter.setDoctorConsultationDone(true);
            // admin can be standing in for either role - mark both done
            // rather than guessing which one they meant.
            case "admin" -> {
                encounter.setNurseConsultationDone(true);
                encounter.setDoctorConsultationDone(true);
            }
            default -> throw new InvalidAuthorRoleException(authorRole, VALID_AUTHOR_ROLES);
        }

        encounterRepository.save(encounter);
    }

    private ConsultationResponse toResponse(Consultation c) {
        return ConsultationResponse.from(c, parseDetails(c.getDetails()));
    }

    private String toJson(Map<String, Object> details) {
        try {
            return objectMapper.writeValueAsString(details == null ? Map.of() : details);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize consultation details to JSON", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseDetails(String json) {
        if (json == null || json.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            // Malformed JSON already sitting in the column shouldn't break
            // reads for the rest of the app - degrade to an empty map.
            return new HashMap<>();
        }
    }

    // Mirrors formatDiagnosisText() in utils/consultations.js: "Common
    // cold (J00)" - the free-text diagnosis with whatever ICD-10 code(s)
    // were picked appended in parentheses.
    @SuppressWarnings("unchecked")
    private String formatDiagnosisText(String diagnosis, Map<String, Object> details) {
        String text = diagnosis == null ? "" : diagnosis.trim();

        Object rawCodes = details.get("icdDiagnoses");
        List<Map<String, Object>> icdDiagnoses = rawCodes instanceof List
                ? (List<Map<String, Object>>) rawCodes
                : List.of();

        List<String> codes = icdDiagnoses.stream()
                .map(d -> (String) d.get("code"))
                .filter(code -> code != null && !code.isBlank())
                .toList();

        if (!text.isEmpty() && !codes.isEmpty()) {
            return text + " (" + String.join(", ", codes) + ")";
        }
        if (!text.isEmpty()) {
            return text;
        }
        if (!codes.isEmpty()) {
            return icdDiagnoses.stream()
                    .map(d -> {
                        String code = (String) d.get("code");
                        String name = (String) d.get("name");
                        return name != null && !name.isBlank() ? code + " - " + name : code;
                    })
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("");
        }
        return "";
    }
}