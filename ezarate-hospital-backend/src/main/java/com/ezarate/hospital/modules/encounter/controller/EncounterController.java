package com.ezarate.hospital.modules.encounter.controller;

import com.ezarate.hospital.modules.encounter.dto.*;
import com.ezarate.hospital.modules.encounter.service.EncounterService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class EncounterController {

    private final EncounterService encounterService;

    public EncounterController(EncounterService encounterService) {
        this.encounterService = encounterService;
    }

    // Registration — create a new encounter for a patient.
    @PostMapping("/api/patients/{patientId}/encounters")
    @ResponseStatus(HttpStatus.CREATED)
    public EncounterResponse create(@PathVariable UUID patientId, @Valid @RequestBody EncounterRequest request) {
        return encounterService.create(patientId, request);
    }

    // Backs the Patient Profile's Encounters/Registration panel.
    @GetMapping("/api/patients/{patientId}/encounters")
    public List<EncounterResponse> getHistoryByPatient(@PathVariable UUID patientId) {
        return encounterService.getHistoryByPatient(patientId);
    }

    // Backs the Registrations/Encounters list page's search box + filters.
    @GetMapping("/api/encounters")
    public Page<EncounterResponse> search(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String patientType,
            @PageableDefault(size = 25) Pageable pageable
    ) {
        return encounterService.search(query, status, patientType, pageable);
    }

    @GetMapping("/api/encounters/{id}")
    public EncounterResponse getById(@PathVariable String id) {
        return encounterService.getById(id);
    }

    // Doctor assignment, fee, payment type, reason for visiting,
    // nurse/doctor consultation-done flags, migrated/PCU status, etc.
    // Does NOT change patientType — use /transfer for that.
    @PutMapping("/api/encounters/{id}")
    public EncounterResponse update(@PathVariable String id, @Valid @RequestBody EncounterRequest request) {
        return encounterService.update(id, request);
    }

    @PatchMapping("/api/encounters/{id}/status")
    public EncounterResponse updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        return encounterService.updateStatus(id, body.get("status"));
    }

    @PostMapping("/api/encounters/{id}/cancel")
    public EncounterResponse cancel(@PathVariable String id) {
        return encounterService.cancel(id);
    }

    // Archive.jsx's "Delete Permanently" — irreversible, so Admin-only.
    // Only allowed on an already CANCELLED registration (enforced in the
    // service).
    @DeleteMapping("/api/encounters/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermanently(@PathVariable String id) {
        encounterService.deletePermanently(id);
    }

    // ER <-> OPD Transfer Patient.
    @PostMapping("/api/encounters/{id}/transfer")
    public EncounterResponse transferPatientType(
            @PathVariable String id,
            @Valid @RequestBody TransferPatientTypeRequest request
    ) {
        return encounterService.transferPatientType(id, request);
    }

    // --- Triage ---

    @GetMapping("/api/encounters/{id}/triage")
    public TriageResponse getTriage(@PathVariable String id) {
        return encounterService.getTriage(id);
    }

    @PutMapping("/api/encounters/{id}/triage")
    public TriageResponse saveTriage(@PathVariable String id, @RequestBody TriageRequest request) {
        return encounterService.saveTriage(id, request);
    }

    // --- Waiver ---

    @GetMapping("/api/encounters/{id}/waiver")
    public WaiverResponse getWaiver(@PathVariable String id) {
        return encounterService.getWaiver(id);
    }

    @PutMapping("/api/encounters/{id}/waiver")
    public WaiverResponse saveWaiver(@PathVariable String id, @RequestBody WaiverRequest request) {
        return encounterService.saveWaiver(id, request);
    }
}