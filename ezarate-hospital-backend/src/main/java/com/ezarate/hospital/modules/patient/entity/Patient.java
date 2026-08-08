package com.ezarate.hospital.modules.patient.entity;

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
import java.util.UUID;

@Entity
@Table(name = "patients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "hospital_no", unique = true, insertable = false, updatable = false)
    private String hospitalNo; // DB-generated (generate_hospital_no()) — never set from Java

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "middle_name")
    @Builder.Default
    private String middleName = "";

    @Builder.Default
    private String suffix = "";

    /** "Male" or "Female" — matches patients.sex CHECK constraint. */
    @Column(nullable = false)
    private String sex;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Builder.Default
    private String email = "";

    @Builder.Default
    private String landline = "";

    @Builder.Default
    private String mobile = "";

    @Column(name = "has_guardian")
    @Builder.Default
    private boolean hasGuardian = false;

    @Column(nullable = false)
    private String address;

    private String region;
    @Column(name = "region_code")
    private String regionCode;
    private String province;
    @Column(name = "province_code")
    private String provinceCode;
    private String city;
    @Column(name = "city_code")
    private String cityCode;
    private String barangay;
    @Column(name = "zip_code")
    private String zipCode;

    @Column(name = "mother_name")
    @Builder.Default
    private String motherName = "";
    @Column(name = "mother_contact")
    @Builder.Default
    private String motherContact = "";
    @Column(name = "father_name")
    @Builder.Default
    private String fatherName = "";
    @Column(name = "father_contact")
    @Builder.Default
    private String fatherContact = "";
    @Builder.Default
    private String nationality = "";
    @Builder.Default
    private String religion = "";
    @Column(name = "marital_status")
    @Builder.Default
    private String maritalStatus = "";

    @Column(name = "emergency_name")
    @Builder.Default
    private String emergencyName = "";
    @Column(name = "emergency_address")
    @Builder.Default
    private String emergencyAddress = "";
    @Column(name = "emergency_relationship")
    @Builder.Default
    private String emergencyRelationship = "";
    @Column(name = "emergency_phone_home")
    @Builder.Default
    private String emergencyPhoneHome = "";
    @Column(name = "emergency_phone_cell")
    @Builder.Default
    private String emergencyPhoneCell = "";

    @Column(name = "konsulta_eligibility")
    @Builder.Default
    private String konsultaEligibility = "Not Set";

    /** Base64 data URL. */
    private String photo;

    /** Cross-form auto-fill store (EMR / Discharge / Konsulta / MedCert). Raw JSON text. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "shared_clinical", columnDefinition = "jsonb")
    @Builder.Default
    private String sharedClinical = "{}";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
