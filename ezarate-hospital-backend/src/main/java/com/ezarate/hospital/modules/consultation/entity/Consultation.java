package com.ezarate.hospital.modules.consultation.entity;

import com.ezarate.hospital.modules.patient.entity.Patient;
import com.ezarate.hospital.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "consultations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consultation {

    // id is assigned in Java (ConsultationService calls the same
    // generate_daily_sequence_id('CONS-') Postgres function via a native
    // query BEFORE persisting), not left to the column's own DB DEFAULT -
    // Hibernate needs to know an entity's @Id before INSERT, and there's
    // no clean way to have it discover a DB-generated non-numeric PK
    // afterward the way an IDENTITY/SERIAL column would allow.
    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    // No Encounter entity exists yet - kept as a plain column rather than
    // a @ManyToOne. Swap this for a real relation once the Encounter
    // module is built; the underlying FK/column name won't need to change.
    @Column(name = "encounter_id", length = 30)
    private String encounterId;

    // One of: er_nurse, opd_nurse, doctor, admin (matches the DB CHECK
    // constraint). Kept as a plain String, validated in the service -
    // same convention User.role already uses.
    @Column(name = "author_role", nullable = false, length = 30)
    private String authorRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    // --- Promoted fields ---
    @Column(name = "chief_complaint", columnDefinition = "text")
    private String chiefComplaint;
    @Column(name = "history_of_present_illness", columnDefinition = "text")
    private String historyOfPresentIllness;
    @Column(columnDefinition = "text")
    private String diagnosis;
    @Column(name = "medication_orders", columnDefinition = "text")
    private String medicationOrders;
    private String disposition;
    @Column(name = "disposition_notes", columnDefinition = "text")
    private String dispositionNotes;
    @Column(columnDefinition = "text")
    private String allergies;
    @Column(name = "blood_type")
    private String bloodType;

    // --- PhilHealth CF4 fields ---
    @Column(name = "admitting_diagnosis", columnDefinition = "text")
    private String admittingDiagnosis;
    @Column(name = "discharge_diagnosis", columnDefinition = "text")
    private String dischargeDiagnosis;
    @Column(name = "case_rate_code_1")
    private String caseRateCode1;
    @Column(name = "case_rate_code_2")
    private String caseRateCode2;
    @Column(name = "date_admitted")
    private LocalDate dateAdmitted;
    @Column(name = "date_discharged")
    private LocalDate dateDischarged;
    @Column(name = "outcome_of_treatment")
    private String outcomeOfTreatment;

    // Everything else the 100+-field Consultation Form captures (Signs &
    // Symptoms / Physical Exam checklists, Course in the Ward, referral
    // fields, certification fields, etc.) - stored as raw JSON text,
    // (de)serialized to/from a Map in ConsultationService.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String details = "{}";

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
