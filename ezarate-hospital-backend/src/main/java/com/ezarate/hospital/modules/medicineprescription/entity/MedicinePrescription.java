package com.ezarate.hospital.modules.medicineprescription.entity;

import com.ezarate.hospital.modules.encounter.entity.Encounter;
import com.ezarate.hospital.modules.patient.entity.Patient;
import com.ezarate.hospital.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "medicine_prescriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicinePrescription {

    // Same convention as Encounter/LabOrder: id generated in Java via
    // generate_daily_sequence_id('MED-') before persisting.
    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    // Nullable: the standalone "/medicine-prescriptions/add" flow isn't
    // tied to a registration. When set (from the Consultation Form),
    // uq_medicine_prescriptions_one_per_encounter enforces one per visit.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "encounter_id")
    private Encounter encounter;

    @Column(name = "prescribed_by", nullable = false, length = 150)
    private String prescribedBy;

    /** ACTIVE or CANCELLED — matches chk_medicine_prescriptions_status. */
    @Builder.Default
    private String status = "ACTIVE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "date_created", insertable = false, updatable = false)
    private OffsetDateTime dateCreated;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PrescriptionItem> items = new ArrayList<>();
}
