package com.ezarate.hospital.modules.encounter.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** One-to-one with {@link Encounter}. WaiverModal.jsx. */
@Entity
@Table(name = "encounter_waivers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EncounterWaiver {

    @Id
    @Column(name = "encounter_id", length = 30)
    private String encounterId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "encounter_id")
    private Encounter encounter;

    @Builder.Default
    private boolean signed = false;
    @Column(name = "signed_by")
    private String signedBy;
    private String relationship;
    @Column(name = "waiver_date")
    private LocalDate waiverDate;
    @Column(columnDefinition = "text")
    private String reason;
}