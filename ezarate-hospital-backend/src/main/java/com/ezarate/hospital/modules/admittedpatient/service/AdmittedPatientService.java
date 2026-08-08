package com.ezarate.hospital.modules.admittedpatient.service;

import com.ezarate.hospital.modules.admittedpatient.dto.AdmittedPatientResponse;
import com.ezarate.hospital.modules.admittedpatient.exception.AdmittedPatientNotFoundException;
import com.ezarate.hospital.modules.consultation.entity.Consultation;
import com.ezarate.hospital.modules.consultation.repository.ConsultationRepository;
import com.ezarate.hospital.modules.encounter.entity.Encounter;
import com.ezarate.hospital.modules.encounter.repository.EncounterRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Admitted Patients — read-only list, derived entirely from data that
// already exists (consultations.disposition, plus the patients/encounters
// it's joined against). No new table needed — same rationale the old
// utils/admittedPatients.js banner already documented; this is just that
// same query moved server-side.
//
// WHY THIS WORKS WITHOUT ANY NEW STATE: ConsultationService.save() upserts
// ONE row per (encounterId, authorRole) — a doctor's second save of the
// same registration UPDATEs their existing row instead of adding a new
// one. So the instant a doctor changes a patient's Disposition from
// "Admitted" to anything else and saves, this list (simply filtered to
// disposition = 'Admitted') drops that patient automatically.
@Service
public class AdmittedPatientService {

    private static final String DISCHARGED = "Discharged";

    private final ConsultationRepository consultationRepository;
    private final EncounterRepository encounterRepository;
    private final ObjectMapper objectMapper;

    public AdmittedPatientService(
            ConsultationRepository consultationRepository,
            EncounterRepository encounterRepository,
            ObjectMapper objectMapper
    ) {
        this.consultationRepository = consultationRepository;
        this.encounterRepository = encounterRepository;
        this.objectMapper = objectMapper;
    }

    // Fetches every currently-admitted patient, then keeps only ONE row
    // per patient — the most recently updated one. Two admitted rows for
    // the same hospitalNo can genuinely exist (e.g. an ER admission and,
    // separately, an OPD one), but the list itself should read "one line
    // per patient" rather than one line per registration; anything older
    // than a patient's latest is simply dropped from this list (it's
    // still on file under that registration's own Consultation entry).
    @Transactional(readOnly = true)
    public List<AdmittedPatientResponse> list() {
        List<Consultation> rows = consultationRepository
                .findByAuthorRoleAndDispositionOrderByUpdatedAtDesc("doctor", "Admitted");

        // Batch-resolve encounters instead of one lookup per row.
        Map<String, Encounter> encountersById = new LinkedHashMap<>();
        encounterRepository.findAllById(
                rows.stream().map(Consultation::getEncounterId).filter(id -> id != null && !id.isBlank()).toList()
        ).forEach(e -> encountersById.put(e.getId(), e));

        Map<String, AdmittedPatientResponse> onePerPatient = new LinkedHashMap<>();
        for (Consultation c : rows) {
            String key = c.getPatient().getHospitalNo() != null
                    ? c.getPatient().getHospitalNo()
                    : c.getId();
            if (onePerPatient.containsKey(key)) continue; // rows are already newest-first

            Encounter encounter = c.getEncounterId() != null ? encountersById.get(c.getEncounterId()) : null;
            onePerPatient.put(key, AdmittedPatientResponse.from(c, encounter, attendingPrintedName(c)));
        }
        return List.copyOf(onePerPatient.values());
    }

    // "Discharged" quick action from the Admitted Patients list itself —
    // flips that patient's most recent doctor consultation Disposition
    // away from "Admitted" without needing to open the full Consultation
    // Form. Since list() is simply "every consultation row where
    // disposition = 'Admitted'", updating that same row's disposition here
    // is exactly what makes the patient drop off the list on next refresh.
    @Transactional
    public void discharge(String consultationId) {
        Consultation c = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new AdmittedPatientNotFoundException(consultationId));
        c.setDisposition(DISCHARGED);
        consultationRepository.save(c);
    }

    // attendingPrintedName isn't one of the columns promoted out of
    // `details` — it's read straight off the jsonb blob here, same as the
    // old rowToAdmittedPatient() did off row.details.
    @SuppressWarnings("unchecked")
    private String attendingPrintedName(Consultation c) {
        String json = c.getDetails();
        if (json == null || json.isBlank()) return null;
        try {
            Map<String, Object> details = objectMapper.readValue(json, Map.class);
            Object value = details.get("attendingPrintedName");
            return value != null ? value.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
