package com.ezarate.hospital.modules.patient.controller;

import com.ezarate.hospital.modules.patient.dto.PatientRequest;
import com.ezarate.hospital.modules.patient.dto.PatientResponse;
import com.ezarate.hospital.modules.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    /** Backs the Patients list page's search box — blank query returns everyone, paginated. */
    @GetMapping
    public Page<PatientResponse> search(
            @RequestParam(required = false, defaultValue = "") String query,
            @PageableDefault(size = 25) Pageable pageable
    ) {
        return patientService.search(query, pageable);
    }

    @GetMapping("/{id}")
    public PatientResponse getById(@PathVariable UUID id) {
        return patientService.getById(id);
    }

    @GetMapping("/by-hospital-no/{hospitalNo}")
    public PatientResponse getByHospitalNo(@PathVariable String hospitalNo) {
        return patientService.getByHospitalNo(hospitalNo);
    }

    /** CreatePatientModal.jsx's same-identity check before insert: exact first+last name (case-insensitive) + exact DOB. */
    @GetMapping("/duplicate-check")
    public ResponseEntity<PatientResponse> duplicateCheck(
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam LocalDate dateOfBirth
    ) {
        PatientResponse match = patientService.findDuplicate(firstName, lastName, dateOfBirth);
        return match == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(match);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PatientResponse create(@Valid @RequestBody PatientRequest request) {
        return patientService.create(request);
    }

    @PutMapping("/{id}")
    public PatientResponse update(@PathVariable UUID id, @Valid @RequestBody PatientRequest request) {
        return patientService.update(id, request);
    }

    // --- Shared Clinical Fields (cross-form auto-fill store) ---
    // Backs pages/patient/sharedClinicalFields.js's loadSharedClinical() /
    // saveSharedClinical() — the EMR/Consultation/Discharge/Konsulta/
    // MedCert "fill blanks from whatever another form already captured"
    // behavior. Keyed by hospitalNo, same as every other screen that reads
    // this record, rather than the uuid PK.

    @GetMapping("/by-hospital-no/{hospitalNo}/shared-clinical")
    public Map<String, Object> getSharedClinical(@PathVariable String hospitalNo) {
        return patientService.getSharedClinical(hospitalNo);
    }

    // Merge-patch: any key not present in the request body is left as-is.
    // The full merged map is returned so the frontend can just replace its
    // local `shared` state with the response, no extra GET needed.
    @PatchMapping("/by-hospital-no/{hospitalNo}/shared-clinical")
    public Map<String, Object> patchSharedClinical(
            @PathVariable String hospitalNo,
            @RequestBody Map<String, Object> patch
    ) {
        return patientService.patchSharedClinical(hospitalNo, patch);
    }
}