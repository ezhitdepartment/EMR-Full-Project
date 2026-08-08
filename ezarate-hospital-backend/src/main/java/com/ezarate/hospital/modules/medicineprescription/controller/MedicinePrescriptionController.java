package com.ezarate.hospital.modules.medicineprescription.controller;

import com.ezarate.hospital.modules.medicineprescription.dto.MedicinePrescriptionRequest;
import com.ezarate.hospital.modules.medicineprescription.dto.MedicinePrescriptionResponse;
import com.ezarate.hospital.modules.medicineprescription.service.MedicinePrescriptionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class MedicinePrescriptionController {

    private final MedicinePrescriptionService prescriptionService;

    public MedicinePrescriptionController(MedicinePrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    // Standalone "/medicine-prescriptions/add" flow.
    @PostMapping("/api/medicine-prescriptions")
    @ResponseStatus(HttpStatus.CREATED)
    public MedicinePrescriptionResponse create(@Valid @RequestBody MedicinePrescriptionRequest request) {
        return prescriptionService.create(request);
    }

    // Consultation Form's Medicine Prescription section — one prescription
    // per registration, synced on every save.
    @PutMapping("/api/encounters/{encounterId}/medicine-prescription")
    public MedicinePrescriptionResponse upsertForEncounter(
            @PathVariable String encounterId,
            @Valid @RequestBody MedicinePrescriptionRequest request
    ) {
        return prescriptionService.upsertForEncounter(encounterId, request);
    }

    @GetMapping("/api/encounters/{encounterId}/medicine-prescription")
    public MedicinePrescriptionResponse getByEncounter(@PathVariable String encounterId) {
        return prescriptionService.getByEncounter(encounterId);
    }

    @GetMapping("/api/encounters/{encounterId}/medicine-names")
    public List<String> getMedicineNamesForEncounter(@PathVariable String encounterId) {
        return prescriptionService.getMedicineNamesForEncounter(encounterId);
    }

    @GetMapping("/api/medicine-prescriptions")
    public Page<MedicinePrescriptionResponse> search(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 25) Pageable pageable
    ) {
        return prescriptionService.search(query, status, pageable);
    }

    @GetMapping("/api/medicine-prescriptions/{id}")
    public MedicinePrescriptionResponse getById(@PathVariable String id) {
        return prescriptionService.getById(id);
    }

    @GetMapping("/api/patients/{patientId}/medicine-prescriptions")
    public List<MedicinePrescriptionResponse> getHistoryByPatient(@PathVariable UUID patientId) {
        return prescriptionService.getHistoryByPatient(patientId);
    }

    @PostMapping("/api/medicine-prescriptions/{id}/cancel")
    public MedicinePrescriptionResponse cancel(@PathVariable String id) {
        return prescriptionService.cancel(id);
    }

    // Archive.jsx's "Delete Permanently" — irreversible, so Admin-only.
    // Only allowed on an already CANCELLED prescription (enforced in the
    // service).
    @DeleteMapping("/api/medicine-prescriptions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermanently(@PathVariable String id) {
        prescriptionService.deletePermanently(id);
    }
}
