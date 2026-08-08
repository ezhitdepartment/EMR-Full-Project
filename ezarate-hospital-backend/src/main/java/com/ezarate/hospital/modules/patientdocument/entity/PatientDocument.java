package com.ezarate.hospital.modules.patientdocument.entity;

import com.ezarate.hospital.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "patient_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(PatientDocument.PatientDocumentId.class)
public class PatientDocument {

    @Id
    @Column(name = "hospital_no")
    private String hospitalNo;

    /** One of: emr, discharge, konsulta, medcert, medabstract, admitdischarge. */
    @Id
    @Column(name = "doc_type")
    private String docType;

    /** Raw JSON text — the shape of each form's fields, kept flexible on purpose. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String data = "{}";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PatientDocumentId implements Serializable {
        private String hospitalNo;
        private String docType;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PatientDocumentId that)) return false;
            return Objects.equals(hospitalNo, that.hospitalNo) && Objects.equals(docType, that.docType);
        }

        @Override
        public int hashCode() {
            return Objects.hash(hospitalNo, docType);
        }
    }
}
