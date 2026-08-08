package com.ezarate.hospital.modules.medicineprescription.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "prescription_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private MedicinePrescription prescription;

    // Free text, not FK'd to medicine_catalog — mirrors the frontend's own
    // static MEDICINE_CATALOG picker (utils/medicinePrescriptions.js),
    // which was never wired to the DB's medicine_catalog reference table.
    @Column(name = "medicine_name", nullable = false, length = 150)
    private String medicineName;

    @Column(length = 30)
    private String milligram;

    @Builder.Default
    private Integer quantity = 1;

    @Column(columnDefinition = "text")
    private String instructions;
}
