package com.ezarate.hospital.modules.report.entity;

import com.ezarate.hospital.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

// Ledger of "recent reports" the Reports page lists — the reports
// themselves are computed live from patients/encounters/consultations
// (see ReportController's data endpoints elsewhere); this table just
// records that a report was generated and by whom, backing Reports.jsx's
// history table and Archive.jsx's "Cancelled/Generated Reports" tab.
@Entity
@Table(name = "generated_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratedReport {

    // id is assigned in Java (ReportService calls the same
    // generate_daily_sequence_id('RPT-') Postgres function via a native
    // query BEFORE persisting), not left to the column's own DB DEFAULT -
    // Hibernate needs to know an entity's @Id before INSERT, same
    // convention as Consultation/Encounter/LabOrder/MedicinePrescription.
    @Id
    @Column(length = 30)
    private String id;

    @Column(name = "report_type", nullable = false, length = 100)
    private String reportType;

    @Column(nullable = false)
    private Integer year;

    // Denormalized on purpose (same reasoning as login_events): if this
    // person's account changes later, the report still correctly shows
    // who generated it *at the time*.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generated_by")
    private User generatedBy;

    @Column(name = "generated_by_name", length = 150)
    private String generatedByName;

    @Column(name = "row_count", nullable = false)
    @Builder.Default
    private Integer rowCount = 0;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "Completed";

    @Column(name = "generated_at", insertable = false, updatable = false)
    private OffsetDateTime generatedAt;
}
