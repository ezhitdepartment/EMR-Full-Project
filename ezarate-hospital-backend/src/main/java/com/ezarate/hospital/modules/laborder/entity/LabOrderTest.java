package com.ezarate.hospital.modules.laborder.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

// One row per diagnostic test within an order — this, not the order
// itself, is the actual unit of work a Med Tech/X-ray Tech processes.
// test_name is a natural-key FK into lab_test_catalog (see
// LabTestCatalog), same pattern the original schema used.
@Entity
@Table(name = "lab_order_tests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabOrderTest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private LabOrder order;

    @Column(name = "test_name", nullable = false, length = 150)
    private String testName;

    /** e.g. "CBC-202607-0036" — pre-generated client-side at creation. */
    @Column(length = 30)
    private String code;

    /** One of PENDING, DONE, CANCELLED — matches chk_lab_order_tests_status. */
    @Builder.Default
    private String status = "PENDING";

    /**
     * WAITING or SERVING — independent of {@link #status}; only
     * meaningful while status = PENDING. Backs the Lab Queue page.
     */
    @Column(name = "queue_status")
    @Builder.Default
    private String queueStatus = "WAITING";

    @Column(name = "is_referred", length = 10)
    private String isReferred;

    @Column(name = "performed_by", length = 150)
    private String performedBy;

    @Column(name = "date_performed")
    private LocalDate datePerformed;

    private BigDecimal fee;

    @Column(columnDefinition = "text")
    private String remarks;

    /** Free-text detail for "Others (...)" tests, e.g. "indicate type/s". */
    @Column(name = "test_detail", columnDefinition = "text")
    private String testDetail;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
