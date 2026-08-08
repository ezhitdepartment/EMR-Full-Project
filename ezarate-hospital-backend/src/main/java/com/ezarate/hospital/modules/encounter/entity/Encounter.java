package com.ezarate.hospital.modules.encounter.entity;

import com.ezarate.hospital.modules.patient.entity.Patient;
import com.ezarate.hospital.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "encounters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Encounter {

    // Same convention Consultation already uses: id is generated in Java
    // (EncounterService calls generate_daily_sequence_id('E-') via a
    // native query BEFORE persisting), not left to the column's own DB
    // DEFAULT — Hibernate needs to know an entity's @Id before INSERT,
    // and there's no clean way to have it discover a DB-generated
    // non-numeric PK afterward the way an IDENTITY/SERIAL column would
    // allow.
    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "appointment_date", nullable = false)
    private LocalDate appointmentDate;

    @Column(name = "consultation_type", nullable = false, length = 100)
    private String consultationType;

    @Column(name = "reason_for_visiting", columnDefinition = "text")
    private String reasonForVisiting;

    // Plain string, not a FK yet — see doctors_directory note in V2.
    private String doctor;

    @Builder.Default
    private BigDecimal fee = BigDecimal.ZERO;

    @Column(name = "payment_type", length = 50)
    private String paymentType;

    /** Base64 data URL captured at registration. */
    private String photo;

    // Decided per-registration (not per-patient) by the role of whoever's
    // registering — the same patient can be ER one visit, OPD the next.
    // "ER Patient" or "OPD Patient" — matches chk_encounters_patient_type.
    @Column(name = "patient_type", nullable = false, length = 30)
    @Builder.Default
    private String patientType = "OPD Patient";

    /** One of PENDING, COMPLETED, CANCELLED — matches chk_encounters_status. */
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "nurse_consultation_done")
    @Builder.Default
    private boolean nurseConsultationDone = false;

    @Column(name = "doctor_consultation_done")
    @Builder.Default
    private boolean doctorConsultationDone = false;

    // Assigned once, automatically, by trg_encounters_set_census_no the
    // moment either consultation half is saved — never set directly by
    // the app EXCEPT when explicitly cleared back to null as part of a
    // patient-type transfer (see EncounterService#transferPatientType),
    // which lets the trigger reissue a fresh number under the new type's
    // own counter in the same write.
    @Column(name = "census_no", length = 30)
    private String censusNo;

    @Column(name = "migrated_status", nullable = false, length = 30)
    @Builder.Default
    private String migratedStatus = "Not Migrated";

    @Column(name = "pcu_status", nullable = false, length = 30)
    @Builder.Default
    private String pcuStatus = "N/A";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "date_created", insertable = false, updatable = false)
    private OffsetDateTime dateCreated;
}