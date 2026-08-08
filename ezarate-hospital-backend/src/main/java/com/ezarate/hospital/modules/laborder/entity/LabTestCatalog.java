package com.ezarate.hospital.modules.laborder.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Read-only reference table (V2__reference_data.sql) — the request-slip
// catalog CreateLabOrderModal/XRayOrders read from, and the source of
// truth for which formType (Laboratory / X-Ray / Ultrasound & Imaging) a
// given test belongs to, used to scope med_tech/xray_tech visibility the
// same way current_user_can_access_form_type() did under RLS.
@Entity
@Table(name = "lab_test_catalog")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LabTestCatalog {

    @Id
    @jakarta.persistence.Column(name = "test_name", length = 150)
    private String testName;

    @jakarta.persistence.Column(name = "form_type", nullable = false, length = 30)
    private String formType;

    @jakarta.persistence.Column(nullable = false, length = 100)
    private String category;

    @jakarta.persistence.Column(name = "code_prefix", nullable = false, length = 20)
    private String codePrefix;
}
