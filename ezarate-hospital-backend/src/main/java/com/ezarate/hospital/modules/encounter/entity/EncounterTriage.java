package com.ezarate.hospital.modules.encounter.entity;

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

/** One-to-one with {@link Encounter}. Vitals recorded by the nurse in TriagePage.jsx. */
@Entity
@Table(name = "encounter_triage")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EncounterTriage {

    @Id
    @Column(name = "encounter_id", length = 30)
    private String encounterId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "encounter_id")
    private Encounter encounter;

    private Integer systolic;
    private Integer diastolic;
    @Column(name = "heart_rate")
    private Integer heartRate;
    @Column(name = "respiratory_rate")
    private Integer respiratoryRate;
    private BigDecimal temperature;
    /** cm */
    private BigDecimal height;
    /** kg */
    private BigDecimal weight;
    /** computed client-side from height/weight */
    private BigDecimal bmi;
    @Column(name = "left_vision")
    private String leftVision;
    @Column(name = "right_vision")
    private String rightVision;

    @Column(name = "lab_imaging_enabled")
    @Builder.Default
    private boolean labImagingEnabled = true;
    @Column(name = "fbs_glucose_mg_dl")
    private BigDecimal fbsGlucoseMgDl;
    @Column(name = "fbs_glucose_mmol_l")
    private BigDecimal fbsGlucoseMmolL;
    @Column(name = "fbs_date_performed")
    private LocalDate fbsDatePerformed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}