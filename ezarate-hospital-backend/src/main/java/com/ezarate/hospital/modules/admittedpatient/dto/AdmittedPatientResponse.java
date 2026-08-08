package com.ezarate.hospital.modules.admittedpatient.dto;

import com.ezarate.hospital.modules.consultation.entity.Consultation;
import com.ezarate.hospital.modules.encounter.entity.Encounter;
import com.ezarate.hospital.modules.patient.entity.Patient;

import java.time.LocalDate;
import java.time.OffsetDateTime;

// Flattened one-row-per-admitted-patient shape — matches rowToAdmittedPatient()
// in the old utils/admittedPatients.js exactly, field for field, so
// AdmittedPatients.jsx / MedicalAbstractPage.jsx / AdmissionDischargeRecordPage.jsx
// don't need any changes on the frontend.
public record AdmittedPatientResponse(
        String consultationId,
        String encounterId,
        String hospitalNo,
        String lastName,
        String firstName,
        String middleName,
        String fullName,
        String sex,
        LocalDate dateOfBirth,
        String address,
        String patientType,
        String admittingDiagnosis,
        String dischargeDiagnosis,
        LocalDate dateAdmitted,
        LocalDate dateDischarged,
        String attendingPhysician,
        String chiefComplaint,
        String historyOfPresentIllness,
        String medicationOrders,
        String outcomeOfTreatment,
        String allergies,
        String bloodType,
        String dispositionNotes,
        OffsetDateTime updatedAt
) {
    // encounter may be null (the consultation's encounterId didn't
    // resolve to a real registration, e.g. it was later deleted) —
    // patientType/attendingPhysician's encounter.doctor fallback just
    // come back blank in that case, same as the old Supabase left-join
    // would've produced for a dangling encounter_id.
    public static AdmittedPatientResponse from(Consultation c, Encounter encounter, String attendingPrintedName) {
        Patient p = c.getPatient();
        String fullName = String.join(", ",
                java.util.stream.Stream.of(p.getLastName(), p.getFirstName(), p.getMiddleName())
                        .filter(s -> s != null && !s.isBlank())
                        .toList());

        return new AdmittedPatientResponse(
                c.getId(),
                c.getEncounterId(),
                p.getHospitalNo(),
                p.getLastName(),
                p.getFirstName(),
                p.getMiddleName(),
                fullName,
                p.getSex(),
                p.getDateOfBirth(),
                p.getAddress(),
                encounter != null ? encounter.getPatientType() : "",
                c.getAdmittingDiagnosis() != null && !c.getAdmittingDiagnosis().isBlank()
                        ? c.getAdmittingDiagnosis() : c.getDiagnosis(),
                c.getDischargeDiagnosis(),
                c.getDateAdmitted() != null ? c.getDateAdmitted()
                        : (encounter != null ? encounter.getAppointmentDate() : null),
                c.getDateDischarged(),
                (attendingPrintedName != null && !attendingPrintedName.isBlank())
                        ? attendingPrintedName
                        : (encounter != null ? encounter.getDoctor() : null),
                c.getChiefComplaint(),
                c.getHistoryOfPresentIllness(),
                c.getMedicationOrders(),
                c.getOutcomeOfTreatment(),
                c.getAllergies(),
                c.getBloodType(),
                c.getDispositionNotes(),
                c.getUpdatedAt()
        );
    }
}
