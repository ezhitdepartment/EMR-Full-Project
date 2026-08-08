package com.ezarate.hospital.modules.consultation.controller;

import com.ezarate.hospital.modules.consultation.dto.ConsultationRequest;
import com.ezarate.hospital.modules.consultation.dto.ConsultationResponse;
import com.ezarate.hospital.modules.consultation.service.ConsultationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class ConsultationController {

    private final ConsultationService consultationService;

    public ConsultationController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    // Upserts per (encounterId, authorRole) - matches
    // saveConsultationEntry() in the frontend's utils/consultations.js.
    @PostMapping("/api/patients/{patientId}/consultations")
    @ResponseStatus(HttpStatus.OK)
    public ConsultationResponse save(
            @PathVariable UUID patientId,
            @Valid @RequestBody ConsultationRequest request
    ) {
        return consultationService.save(patientId, request);
    }

    // Backs Patient Files - every consultation entry for this patient,
    // newest-edited first.
    @GetMapping("/api/patients/{patientId}/consultations")
    public List<ConsultationResponse> getHistoryByPatient(@PathVariable UUID patientId) {
        return consultationService.getHistoryByPatient(patientId);
    }

    // Backs Reports - every consultation ever saved, across every
    // patient, newest-edited first.
    @GetMapping("/api/consultations")
    public Page<ConsultationResponse> getAll(@PageableDefault(size = 25) Pageable pageable) {
        return consultationService.getAll(pageable);
    }

    // Backs the Registration table's Diagnosis column.
    @GetMapping("/api/consultations/diagnoses-by-encounter")
    public Map<String, String> getDiagnosesByEncounter() {
        return consultationService.getDiagnosesByEncounter();
    }
}
