package com.ezarate.hospital.modules.patient.service;

import com.ezarate.hospital.modules.patient.dto.GuardianDto;
import com.ezarate.hospital.modules.patient.dto.PatientRequest;
import com.ezarate.hospital.modules.patient.dto.PatientResponse;
import com.ezarate.hospital.modules.patient.entity.Patient;
import com.ezarate.hospital.modules.patient.entity.PatientGuardian;
import com.ezarate.hospital.modules.patient.exception.PatientNotFoundException;
import com.ezarate.hospital.modules.patient.repository.PatientGuardianRepository;
import com.ezarate.hospital.modules.patient.repository.PatientRepository;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final PatientGuardianRepository guardianRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    public PatientService(
            PatientRepository patientRepository,
            PatientGuardianRepository guardianRepository,
            UserRepository userRepository,
            CurrentUserProvider currentUserProvider,
            ObjectMapper objectMapper
    ) {
        this.patientRepository = patientRepository;
        this.guardianRepository = guardianRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PatientResponse create(PatientRequest request) {
        Patient patient = new Patient();
        applyRequest(patient, request);

        // Only set at creation - created_by should never change on later edits.
        Optional<UUID> currentUserId = currentUserProvider.currentUserId();
        if (currentUserId.isPresent()) {
            patient.setCreatedBy(userRepository.getReferenceById(currentUserId.get()));
        }

        patient = patientRepository.save(patient);

        // FIX: hospital_no is DB-generated (generate_hospital_no() default) and
        // the column is marked insertable=false, so the in-memory entity does
        // not have it yet right after save(). The previous version called
        // patientRepository.findById(patient.getId()) here to "reload" it, but
        // that runs inside the SAME transaction/persistence context that just
        // did the save() - Hibernate's first-level cache returns the identical
        // cached Java object for that id instead of re-querying Postgres, so
        // hospitalNo stayed null. flush() + refresh() forces an actual
        // round-trip: flush() guarantees the INSERT has really gone out, and
        // refresh() re-SELECTs the row and overwrites the in-memory fields
        // with whatever Postgres actually has - including the generated
        // hospital_no.
        entityManager.flush();
        entityManager.refresh(patient);

        PatientGuardian guardian = saveGuardianIfPresent(patient, request);
        return PatientResponse.from(patient, guardian);
    }

    @Transactional(readOnly = true)
    public PatientResponse getById(UUID id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException(id));
        PatientGuardian guardian = patient.isHasGuardian()
                ? guardianRepository.findById(id).orElse(null)
                : null;
        return PatientResponse.from(patient, guardian);
    }

    @Transactional(readOnly = true)
    public PatientResponse getByHospitalNo(String hospitalNo) {
        Patient patient = patientRepository.findByHospitalNo(hospitalNo)
                .orElseThrow(() -> new PatientNotFoundException(hospitalNo));
        PatientGuardian guardian = patient.isHasGuardian()
                ? guardianRepository.findById(patient.getId()).orElse(null)
                : null;
        return PatientResponse.from(patient, guardian);
    }

    @Transactional(readOnly = true)
    public Page<PatientResponse> search(String query, Pageable pageable) {
        return patientRepository.search(query, pageable)
                .map(patient -> {
                    PatientGuardian guardian = patient.isHasGuardian()
                            ? guardianRepository.findById(patient.getId()).orElse(null)
                            : null;
                    return PatientResponse.from(patient, guardian);
                });
    }

    @Transactional(readOnly = true)
    public PatientResponse findDuplicate(String firstName, String lastName, LocalDate dateOfBirth) {
        return patientRepository.findDuplicates(firstName, lastName, dateOfBirth).stream()
                .findFirst()
                .map(patient -> {
                    PatientGuardian guardian = patient.isHasGuardian()
                            ? guardianRepository.findById(patient.getId()).orElse(null)
                            : null;
                    return PatientResponse.from(patient, guardian);
                })
                .orElse(null);
    }

    @Transactional
    public PatientResponse update(UUID id, PatientRequest request) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException(id));

        applyRequest(patient, request);
        patient = patientRepository.save(patient);

        if (!patient.isHasGuardian() && guardianRepository.existsById(id)) {
            guardianRepository.deleteById(id);
        }
        PatientGuardian guardian = saveGuardianIfPresent(patient, request);

        return PatientResponse.from(patient, guardian);
    }

    // --- Shared Clinical Fields (cross-form auto-fill store) -----------
    //
    // patients.shared_clinical is a jsonb column mapped onto Patient as a
    // raw JSON string (see the entity's @JdbcTypeCode(SqlTypes.JSON)
    // field) rather than its own DTO, since its shape is owned entirely
    // by the frontend's SHARED_FIELD_MAP (pages/patient/sharedClinicalFields.js)
    // and never needs to be validated or queried on server-side. These two
    // methods parse/merge/serialize that JSON text so the frontend can just
    // GET the current map and PATCH a partial one, instead of round-tripping
    // a full PatientRequest for a change that has nothing to do with the
    // rest of the patient record.

    @Transactional(readOnly = true)
    public Map<String, Object> getSharedClinical(String hospitalNo) {
        Patient patient = patientRepository.findByHospitalNo(hospitalNo)
                .orElseThrow(() -> new PatientNotFoundException(hospitalNo));
        return parseSharedClinical(patient.getSharedClinical());
    }

    // Merge-patch, not replace: any key already present and not included in
    // `patch` is left untouched — mirrors the old Supabase version's
    // `{ ...current, ...patch }` spread, just done server-side now so the
    // frontend no longer needs its own separate GET-then-merge-then-PUT
    // round trip.
    @Transactional
    public Map<String, Object> patchSharedClinical(String hospitalNo, Map<String, Object> patch) {
        Patient patient = patientRepository.findByHospitalNo(hospitalNo)
                .orElseThrow(() -> new PatientNotFoundException(hospitalNo));

        Map<String, Object> merged = new LinkedHashMap<>(parseSharedClinical(patient.getSharedClinical()));
        if (patch != null) {
            merged.putAll(patch);
        }

        try {
            patient.setSharedClinical(objectMapper.writeValueAsString(merged));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize shared clinical fields", e);
        }
        patientRepository.save(patient);

        return merged;
    }

    private Map<String, Object> parseSharedClinical(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            // Malformed/legacy data shouldn't take the whole page down —
            // degrade to "nothing shared yet" the same way a missing row did
            // under the old Supabase version.
            return new LinkedHashMap<>();
        }
    }

    private void applyRequest(Patient patient, PatientRequest r) {
        patient.setFirstName(r.firstName());
        patient.setLastName(r.lastName());
        patient.setMiddleName(nullToEmpty(r.middleName()));
        patient.setSuffix(nullToEmpty(r.suffix()));
        patient.setSex(r.sex());
        patient.setDateOfBirth(r.dateOfBirth());
        patient.setEmail(nullToEmpty(r.email()));
        patient.setLandline(nullToEmpty(r.landline()));
        patient.setMobile(nullToEmpty(r.mobile()));
        patient.setHasGuardian(r.hasGuardian());
        patient.setAddress(r.address());
        patient.setRegion(r.region());
        patient.setRegionCode(r.regionCode());
        patient.setProvince(r.province());
        patient.setProvinceCode(r.provinceCode());
        patient.setCity(r.city());
        patient.setCityCode(r.cityCode());
        patient.setBarangay(r.barangay());
        patient.setZipCode(r.zipCode());
        patient.setMotherName(nullToEmpty(r.motherName()));
        patient.setMotherContact(nullToEmpty(r.motherContact()));
        patient.setFatherName(nullToEmpty(r.fatherName()));
        patient.setFatherContact(nullToEmpty(r.fatherContact()));
        patient.setNationality(nullToEmpty(r.nationality()));
        patient.setReligion(nullToEmpty(r.religion()));
        patient.setMaritalStatus(nullToEmpty(r.maritalStatus()));
        patient.setEmergencyName(nullToEmpty(r.emergencyName()));
        patient.setEmergencyAddress(nullToEmpty(r.emergencyAddress()));
        patient.setEmergencyRelationship(nullToEmpty(r.emergencyRelationship()));
        patient.setEmergencyPhoneHome(nullToEmpty(r.emergencyPhoneHome()));
        patient.setEmergencyPhoneCell(nullToEmpty(r.emergencyPhoneCell()));
        patient.setKonsultaEligibility(r.konsultaEligibility() == null ? "Not Set" : r.konsultaEligibility());
        patient.setPhoto(r.photo());
        // created_by is intentionally NOT touched here - it's set once, at
        // creation time, in create() above, and must never be overwritten
        // by a later update().
    }

    private PatientGuardian saveGuardianIfPresent(Patient patient, PatientRequest request) {
        if (!request.hasGuardian() || request.guardian() == null) {
            return null;
        }
        GuardianDto g = request.guardian();
        PatientGuardian guardian = guardianRepository.findById(patient.getId())
                .orElseGet(() -> PatientGuardian.builder().patient(patient).build());

        guardian.setFirstName(g.firstName());
        guardian.setLastName(g.lastName());
        guardian.setMiddleName(g.middleName());
        guardian.setSuffix(g.suffix());
        guardian.setSex(g.sex());
        guardian.setDateOfBirth(g.dateOfBirth());
        guardian.setPin(g.pin());
        guardian.setLandline(g.landline());
        guardian.setMobile(g.mobile());

        return guardianRepository.save(guardian);
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}