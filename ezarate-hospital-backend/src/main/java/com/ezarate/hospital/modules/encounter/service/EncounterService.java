package com.ezarate.hospital.modules.encounter.service;

import com.ezarate.hospital.common.exception.NotDeletableException;
import com.ezarate.hospital.modules.consultation.repository.ConsultationRepository;
import com.ezarate.hospital.modules.encounter.dto.*;
import com.ezarate.hospital.modules.encounter.entity.Encounter;
import com.ezarate.hospital.modules.encounter.entity.EncounterTriage;
import com.ezarate.hospital.modules.encounter.entity.EncounterWaiver;
import com.ezarate.hospital.modules.encounter.exception.EncounterNotFoundException;
import com.ezarate.hospital.modules.encounter.exception.InvalidPatientTypeException;
import com.ezarate.hospital.modules.encounter.repository.EncounterRepository;
import com.ezarate.hospital.modules.encounter.repository.EncounterTriageRepository;
import com.ezarate.hospital.modules.encounter.repository.EncounterWaiverRepository;
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
import java.util.UUID;

@Service
public class EncounterService {

    // Matches chk_encounters_patient_type in V5__encounters.sql.
    private static final List<String> VALID_PATIENT_TYPES = List.of("ER Patient", "OPD Patient");

    private final EncounterRepository encounterRepository;
    private final EncounterTriageRepository triageRepository;
    private final EncounterWaiverRepository waiverRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final ConsultationRepository consultationRepository;
    private final CurrentUserProvider currentUserProvider;

    @PersistenceContext
    private EntityManager entityManager;

    public EncounterService(
            EncounterRepository encounterRepository,
            EncounterTriageRepository triageRepository,
            EncounterWaiverRepository waiverRepository,
            PatientRepository patientRepository,
            UserRepository userRepository,
            ConsultationRepository consultationRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.encounterRepository = encounterRepository;
        this.triageRepository = triageRepository;
        this.waiverRepository = waiverRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.consultationRepository = consultationRepository;
        this.currentUserProvider = currentUserProvider;
    }

    // ------------------------------------------------------------------
    // Create / read / search
    // ------------------------------------------------------------------

    @Transactional
    public EncounterResponse create(UUID patientId, EncounterRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException(patientId));

        String patientType = request.patientType() == null || request.patientType().isBlank()
                ? "OPD Patient"
                : request.patientType();
        assertValidPatientType(patientType);
        assertRoleCanAccessPatientType(patientType);

        Encounter encounter = new Encounter();
        encounter.setId(generateId());
        encounter.setPatient(patient);
        encounter.setPatientType(patientType);
        applyRequest(encounter, request);

        currentUserProvider.currentUserId()
                .ifPresent(userId -> encounter.setCreatedBy(userRepository.getReferenceById(userId)));

        Encounter savedEncounter = encounterRepository.save(encounter);

        // date_created / migrated_status / pcu_status carry DB DEFAULTs,
        // and census_no may be touched by trg_encounters_set_census_no on
        // INSERT — same flush()+refresh() fix PatientService/
        // ConsultationService already use so the in-memory entity picks up
        // whatever Postgres actually ended up with instead of Hibernate's
        // first-level cache handing back the pre-save Java object.
        entityManager.flush();
        entityManager.refresh(savedEncounter);

        return EncounterResponse.from(savedEncounter);
    }

    @Transactional(readOnly = true)
    public EncounterResponse getById(String id) {
        Encounter encounter = encounterRepository.findById(id)
                .orElseThrow(() -> new EncounterNotFoundException(id));
        assertRoleCanAccessPatientType(encounter.getPatientType());
        return EncounterResponse.from(encounter);
    }

    // Backs the Patient Profile's Encounters/Registration panel.
    @Transactional(readOnly = true)
    public List<EncounterResponse> getHistoryByPatient(UUID patientId) {
        String restrictTo = restrictToPatientTypeForCurrentUser();
        return encounterRepository.findByPatientIdOrderByDateCreatedDesc(patientId).stream()
                .filter(e -> restrictTo == null || restrictTo.equals(e.getPatientType()))
                .map(EncounterResponse::from)
                .toList();
    }

    // Backs the Registrations/Encounters list page.
    @Transactional(readOnly = true)
    public Page<EncounterResponse> search(String query, String status, String patientType, Pageable pageable) {
        String restrictTo = restrictToPatientTypeForCurrentUser();
        return encounterRepository.search(query, status, patientType, restrictTo, pageable)
                .map(EncounterResponse::from);
    }

    // ------------------------------------------------------------------
    // Update / status / transfer
    // ------------------------------------------------------------------

    // Ordinary edits — doctor assignment, fee, payment type, reason,
    // status (PENDING/COMPLETED/CANCELLED). Deliberately does NOT touch
    // patientType; use transferPatientType() for that. Mirrors the old
    // "encounters: update" RLS USING clause: gated by the row's CURRENT
    // patient_type, same as create()/getById().
    @Transactional
    public EncounterResponse update(String id, EncounterRequest request) {
        Encounter encounter = encounterRepository.findById(id)
                .orElseThrow(() -> new EncounterNotFoundException(id));
        assertRoleCanAccessPatientType(encounter.getPatientType());

        applyRequest(encounter, request);
        encounter = encounterRepository.save(encounter);

        // status/census_no may have been touched by
        // trg_encounters_set_census_no on this UPDATE too (e.g. status ->
        // CANCELLED clears census_no).
        entityManager.flush();
        entityManager.refresh(encounter);

        return EncounterResponse.from(encounter);
    }

    @Transactional
    public EncounterResponse updateStatus(String id, String status) {
        Encounter encounter = encounterRepository.findById(id)
                .orElseThrow(() -> new EncounterNotFoundException(id));
        assertRoleCanAccessPatientType(encounter.getPatientType());

        encounter.setStatus(status);
        encounter = encounterRepository.save(encounter);

        entityManager.flush();
        entityManager.refresh(encounter);
        return EncounterResponse.from(encounter);
    }

    @Transactional
    public EncounterResponse cancel(String id) {
        return updateStatus(id, "CANCELLED");
    }

    // Backs Archive.jsx's "Delete Permanently" button on the Cancelled
    // Registrations tab. Only ever allowed on a CANCELLED encounter — an
    // active/completed registration must be cancelled first, same as the
    // Archive page only ever lists CANCELLED rows to begin with. This
    // encounter's own consultation entries are cleared first since
    // consultations.encounter_id has no ON DELETE clause (unlike
    // lab_orders/medicine_prescriptions, which SET NULL and clean up on
    // their own); triage/waiver rows cascade at the DB level.
    @Transactional
    public void deletePermanently(String id) {
        Encounter encounter = encounterRepository.findById(id)
                .orElseThrow(() -> new EncounterNotFoundException(id));
        assertRoleCanAccessPatientType(encounter.getPatientType());

        if (!"CANCELLED".equals(encounter.getStatus())) {
            throw new NotDeletableException("Only cancelled registrations can be permanently deleted.");
        }

        consultationRepository.deleteByEncounterId(id);
        encounterRepository.delete(encounter);
    }

    // Mirrors the "Allow ER Nurse <-> OPD Nurse to Transfer Patient" fix:
    // USING still gates which EXISTING row a nurse may touch (an OPD
    // Nurse can only start a transfer from a row that is currently OPD
    // Patient, and vice versa) — but the RESULTING patientType is free to
    // land as either type, which is exactly why this is a separate method
    // from update() rather than folded into its general gating. Clearing
    // census_no back to null in the same write lets
    // trg_encounters_set_census_no reissue a fresh number under the new
    // type's own counter, atomically, if a consultation-done flag is
    // already true.
    @Transactional
    public EncounterResponse transferPatientType(String id, TransferPatientTypeRequest request) {
        Encounter encounter = encounterRepository.findById(id)
                .orElseThrow(() -> new EncounterNotFoundException(id));

        // USING: can this role even touch the row as it currently stands?
        assertRoleCanAccessPatientType(encounter.getPatientType());

        assertValidPatientType(request.patientType());

        encounter.setPatientType(request.patientType());
        encounter.setCensusNo(null);
        encounter = encounterRepository.save(encounter);

        entityManager.flush();
        entityManager.refresh(encounter);
        return EncounterResponse.from(encounter);
    }

    // ------------------------------------------------------------------
    // Triage
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public TriageResponse getTriage(String encounterId) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new EncounterNotFoundException(encounterId));
        assertRoleCanAccessPatientType(encounter.getPatientType());

        return triageRepository.findById(encounterId)
                .map(TriageResponse::from)
                .orElse(null);
    }

    @Transactional
    public TriageResponse saveTriage(String encounterId, TriageRequest request) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new EncounterNotFoundException(encounterId));
        assertRoleCanAccessPatientType(encounter.getPatientType());

        EncounterTriage triage = triageRepository.findById(encounterId)
                .orElseGet(() -> EncounterTriage.builder().encounter(encounter).build());

        triage.setSystolic(request.systolic());
        triage.setDiastolic(request.diastolic());
        triage.setHeartRate(request.heartRate());
        triage.setRespiratoryRate(request.respiratoryRate());
        triage.setTemperature(request.temperature());
        triage.setHeight(request.height());
        triage.setWeight(request.weight());
        triage.setBmi(request.bmi());
        triage.setLeftVision(request.leftVision());
        triage.setRightVision(request.rightVision());
        triage.setLabImagingEnabled(request.labImagingEnabled() == null || request.labImagingEnabled());
        triage.setFbsGlucoseMgDl(request.fbsGlucoseMgDl());
        triage.setFbsGlucoseMmolL(request.fbsGlucoseMmolL());
        triage.setFbsDatePerformed(request.fbsDatePerformed());

        boolean isNew = triage.getCreatedBy() == null && triage.getCreatedAt() == null;
        if (isNew) {
            final EncounterTriage newTriage = triage;
            currentUserProvider.currentUserId()
                    .ifPresent(userId -> newTriage.setCreatedBy(userRepository.getReferenceById(userId)));
        }

        triage = triageRepository.save(triage);
        entityManager.flush();
        entityManager.refresh(triage);
        return TriageResponse.from(triage);
    }

    // ------------------------------------------------------------------
    // Waiver
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public WaiverResponse getWaiver(String encounterId) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new EncounterNotFoundException(encounterId));
        assertRoleCanAccessPatientType(encounter.getPatientType());

        return waiverRepository.findById(encounterId)
                .map(WaiverResponse::from)
                .orElse(null);
    }

    @Transactional
    public WaiverResponse saveWaiver(String encounterId, WaiverRequest request) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new EncounterNotFoundException(encounterId));
        assertRoleCanAccessPatientType(encounter.getPatientType());

        EncounterWaiver waiver = waiverRepository.findById(encounterId)
                .orElseGet(() -> EncounterWaiver.builder().encounter(encounter).build());

        waiver.setSigned(request.signed());
        waiver.setSignedBy(request.signedBy());
        waiver.setRelationship(request.relationship());
        waiver.setWaiverDate(request.waiverDate());
        waiver.setReason(request.reason());

        waiver = waiverRepository.save(waiver);
        return WaiverResponse.from(waiver);
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    private void applyRequest(Encounter e, EncounterRequest r) {
        e.setAppointmentDate(r.appointmentDate());
        e.setConsultationType(r.consultationType());
        e.setReasonForVisiting(r.reasonForVisiting());
        e.setDoctor(r.doctor());
        e.setFee(r.fee() == null ? java.math.BigDecimal.ZERO : r.fee());
        e.setPaymentType(r.paymentType());
        e.setPhoto(r.photo());
        e.setNurseConsultationDone(r.nurseConsultationDone() != null && r.nurseConsultationDone());
        e.setDoctorConsultationDone(r.doctorConsultationDone() != null && r.doctorConsultationDone());
        e.setMigratedStatus(r.migratedStatus() == null || r.migratedStatus().isBlank() ? "Not Migrated" : r.migratedStatus());
        e.setPcuStatus(r.pcuStatus() == null || r.pcuStatus().isBlank() ? "N/A" : r.pcuStatus());
        // patientType is intentionally NOT touched here on update() calls —
        // see transferPatientType() for the one place it's allowed to change.
    }

    // "E-20260706-0018" — calls the same atomic, race-safe Postgres
    // function consultations/lab_orders/medicine_prescriptions already
    // use (see generate_daily_sequence_id() in V3__id_generator_infra.sql).
    private String generateId() {
        return (String) entityManager
                .createNativeQuery("SELECT generate_daily_sequence_id('E-')")
                .getSingleResult();
    }

    private void assertValidPatientType(String patientType) {
        if (!VALID_PATIENT_TYPES.contains(patientType)) {
            throw new InvalidPatientTypeException(
                    "patientType must be one of " + VALID_PATIENT_TYPES + ", got \"" + patientType + "\"");
        }
    }

    // Mirrors current_user_can_access_patient_type(): er_nurse is scoped
    // to "ER Patient", opd_nurse to "OPD Patient", every other role
    // (admin, doctor, med_tech, xray_tech, pharmacist, staff) is
    // unrestricted.
    private void assertRoleCanAccessPatientType(String patientType) {
        String role = currentUserProvider.currentUserRole().orElse(null);
        if ("er_nurse".equals(role) && !"ER Patient".equals(patientType)) {
            throw new InvalidPatientTypeException("er_nurse can only access ER Patient registrations");
        }
        if ("opd_nurse".equals(role) && !"OPD Patient".equals(patientType)) {
            throw new InvalidPatientTypeException("opd_nurse can only access OPD Patient registrations");
        }
    }

    // Returns the single patientType this role is scoped to, or null for
    // unrestricted roles — used to build search()/getHistoryByPatient()'s
    // visibility filter without duplicating the per-role switch above.
    private String restrictToPatientTypeForCurrentUser() {
        String role = currentUserProvider.currentUserRole().orElse(null);
        if ("er_nurse".equals(role)) return "ER Patient";
        if ("opd_nurse".equals(role)) return "OPD Patient";
        return null;
    }
}