package com.ezarate.hospital.modules.patientdocument.controller;

import com.ezarate.hospital.modules.patientdocument.dto.PatientDocumentRequest;
import com.ezarate.hospital.modules.patientdocument.dto.PatientDocumentResponse;
import com.ezarate.hospital.modules.patientdocument.service.PatientDocumentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class PatientDocumentController {

    private final PatientDocumentService documentService;

    public PatientDocumentController(PatientDocumentService documentService) {
        this.documentService = documentService;
    }

    // doc_type: emr | discharge | konsulta | medcert | medabstract | admitdischarge
    @GetMapping("/api/patients/{hospitalNo}/documents/{docType}")
    public PatientDocumentResponse get(@PathVariable String hospitalNo, @PathVariable String docType) {
        return documentService.get(hospitalNo, docType);
    }

    @GetMapping("/api/patients/{hospitalNo}/documents")
    public List<PatientDocumentResponse> listForPatient(@PathVariable String hospitalNo) {
        return documentService.listForPatient(hospitalNo);
    }

    @PutMapping("/api/patients/{hospitalNo}/documents/{docType}")
    public PatientDocumentResponse save(
            @PathVariable String hospitalNo,
            @PathVariable String docType,
            @Valid @RequestBody PatientDocumentRequest request
    ) {
        return documentService.save(hospitalNo, docType, request);
    }
}
