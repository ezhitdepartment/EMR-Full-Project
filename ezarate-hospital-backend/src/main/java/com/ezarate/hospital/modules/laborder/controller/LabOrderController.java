package com.ezarate.hospital.modules.laborder.controller;

import com.ezarate.hospital.modules.laborder.dto.*;
import com.ezarate.hospital.modules.laborder.entity.LabOrderFile;
import com.ezarate.hospital.modules.laborder.service.LabOrderFileService;
import com.ezarate.hospital.modules.laborder.service.LabOrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class LabOrderController {

    private final LabOrderService labOrderService;
    private final LabOrderFileService labOrderFileService;

    public LabOrderController(LabOrderService labOrderService, LabOrderFileService labOrderFileService) {
        this.labOrderService = labOrderService;
        this.labOrderFileService = labOrderFileService;
    }

    // Manual "Create Lab Order" (Lab Orders / X-Ray Orders page) — not
    // tied to a specific registration, can repeat freely per patient.
    @PostMapping("/api/lab-orders")
    @ResponseStatus(HttpStatus.CREATED)
    public LabOrderResponse create(@Valid @RequestBody LabOrderCreateRequest request) {
        return labOrderService.create(request);
    }

    // Doctor's Consultation Form auto-order: one order per registration,
    // synced on every save instead of stacking duplicates.
    @PutMapping("/api/encounters/{encounterId}/lab-order")
    public LabOrderResponse upsertForEncounter(
            @PathVariable String encounterId,
            @Valid @RequestBody LabOrderUpsertForEncounterRequest request
    ) {
        return labOrderService.upsertForEncounter(encounterId, request);
    }

    // Backs generateDiagnosticCode() in utils/labOrderDiagnostics.js —
    // called once per checked test, before the test is actually created,
    // so the code can be shown/edited in the modal first.
    @GetMapping("/api/lab-order-tests/generate-code")
    public Map<String, String> generateCode(@RequestParam String testName) {
        return Map.of("code", labOrderService.generateDiagnosticCode(testName));
    }

    @GetMapping("/api/lab-orders")
    public Page<LabOrderResponse> search(
            @RequestParam(required = false, defaultValue = "") String query,
            @PageableDefault(size = 25) Pageable pageable
    ) {
        return labOrderService.search(query, pageable);
    }

    @GetMapping("/api/lab-orders/{id}")
    public LabOrderResponse getById(@PathVariable String id) {
        return labOrderService.getById(id);
    }

    @GetMapping("/api/patients/{patientId}/lab-orders")
    public List<LabOrderResponse> getHistoryByPatient(@PathVariable UUID patientId) {
        return labOrderService.getHistoryByPatient(patientId);
    }

    // Backs the Admitted Patients / Medical Abstract "Ancillaries Done"
    // section — just the flattened test list for one registration, not
    // the full order envelope. Empty list (not 404) when that
    // registration never had a lab order.
    @GetMapping("/api/encounters/{encounterId}/lab-order/tests")
    public List<LabOrderTestResponse> getTestsByEncounter(@PathVariable String encounterId) {
        return labOrderService.getTestsByEncounterId(encounterId);
    }

    // --- Individual test lines (Med Tech / X-ray Tech results entry) ---

    @PatchMapping("/api/lab-orders/{orderId}/tests/{testId}")
    public LabOrderTestResponse updateTest(
            @PathVariable String orderId,
            @PathVariable UUID testId,
            @RequestBody LabOrderTestUpdateRequest request
    ) {
        return labOrderService.updateTest(orderId, testId, request);
    }

    // --- Lab Queue page ---

    @GetMapping("/api/lab-queue")
    public List<LabOrderTestResponse> getQueue() {
        return labOrderService.getQueue();
    }

    @PatchMapping("/api/lab-queue/{testId}")
    public LabOrderTestResponse setQueueStatus(@PathVariable UUID testId, @RequestBody java.util.Map<String, String> body) {
        return labOrderService.setQueueStatus(testId, body.get("queueStatus"));
    }

    // --- Result files — one shared upload area per ORDER, not per test ---

    @PostMapping(value = "/api/lab-orders/{orderId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public LabOrderFileResponse uploadFile(@PathVariable String orderId, @RequestParam("file") MultipartFile file) {
        return labOrderFileService.upload(orderId, file);
    }

    @GetMapping("/api/lab-orders/{orderId}/files")
    public List<LabOrderFileResponse> listFiles(@PathVariable String orderId) {
        return labOrderFileService.listForOrder(orderId);
    }

    // Streams the file back inline — replaces the old signed-URL flow
    // (createSignedUrl) since files aren't in Supabase Storage anymore.
    // Auth is still enforced by SecurityConfig (every /api/** route
    // requires a valid JWT), so this is no more "public" than the old
    // hour-long signed URL was.
    @GetMapping("/api/lab-order-files/{fileId}/download")
    public ResponseEntity<byte[]> downloadFile(@PathVariable UUID fileId) {
        LabOrderFile meta = labOrderFileService.getMetadata(fileId);
        byte[] content = labOrderFileService.download(fileId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + meta.getFileName() + "\"")
                .body(content);
    }

    @DeleteMapping("/api/lab-order-files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFile(@PathVariable UUID fileId) {
        labOrderFileService.delete(fileId);
    }

    // Archive.jsx's "Delete Permanently" — irreversible, so Admin-only
    // regardless of who normally has Lab Orders access. Only allowed on
    // an order whose tests are all CANCELLED (enforced in the service).
    @DeleteMapping("/api/lab-orders/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermanently(@PathVariable String id) {
        labOrderService.deletePermanently(id);
    }
}