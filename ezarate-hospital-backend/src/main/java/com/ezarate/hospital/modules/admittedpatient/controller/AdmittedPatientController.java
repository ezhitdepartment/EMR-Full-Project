package com.ezarate.hospital.modules.admittedpatient.controller;

import com.ezarate.hospital.modules.admittedpatient.dto.AdmittedPatientResponse;
import com.ezarate.hospital.modules.admittedpatient.service.AdmittedPatientService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Backs features/patients/AdmittedPatients.jsx, plus MedicalAbstractPage.jsx
// and AdmissionDischargeRecordPage.jsx (via loadAdmittedPatients() /
// dischargeAdmittedPatient() in utils/admittedPatients.js). No
// @PreAuthorize role check here — matches ConsultationController's own
// endpoints, since "who can see this" is the same "registration"/"patients"
// feature-flag split already enforced client-side, not a hard security
// boundary the way billing or catalog writes are.
@RestController
public class AdmittedPatientController {

    private final AdmittedPatientService admittedPatientService;

    public AdmittedPatientController(AdmittedPatientService admittedPatientService) {
        this.admittedPatientService = admittedPatientService;
    }

    @GetMapping("/api/admitted-patients")
    public List<AdmittedPatientResponse> list() {
        return admittedPatientService.list();
    }

    @PatchMapping("/api/admitted-patients/{consultationId}/discharge")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void discharge(@PathVariable String consultationId) {
        admittedPatientService.discharge(consultationId);
    }
}
