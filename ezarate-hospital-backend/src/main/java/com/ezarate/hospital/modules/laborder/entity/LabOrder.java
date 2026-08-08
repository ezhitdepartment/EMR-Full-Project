package com.ezarate.hospital.modules.laborder.entity;

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
@Table(name = "lab_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabOrder {

    // Same convention as Encounter/Consultation: id generated in Java via
    // generate_daily_sequence_id('LAB-') BEFORE persisting (see
    // LabOrderService#generateId), not left to the column's DB DEFAULT.
    @Id
    @Column(length = 30)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    // Nullable: manually-created orders (Lab Orders page's own "Create Lab
    // Order" button) aren't tied to a registration. When set (auto-created
    // from the doctor's Consultation Form), uq_lab_orders_one_per_encounter
    // guarantees only one order per visit.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "encounter_id")
    private Encounter encounter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "date_created", insertable = false, updatable = false)
    private OffsetDateTime dateCreated;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LabOrderTest> tests = new ArrayList<>();

    // One shared set of uploaded result files per order — see
    // V15__lab_order_files_per_order.sql / LabOrderFile.
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LabOrderFile> files = new ArrayList<>();
}
