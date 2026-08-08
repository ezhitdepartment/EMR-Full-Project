package com.ezarate.hospital.modules.notification.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

// Never written to from Java — every row here is created by a Postgres
// trigger (see V11__notifications.sql: patients/encounters/lab_order_tests
// triggers). This entity exists purely for reading, in the frontend's bell
// icon feed.
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @Column(insertable = false, updatable = false)
    private UUID id;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "target_roles", insertable = false, updatable = false)
    private String[] targetRoles;

    @Column(insertable = false, updatable = false)
    private String type;

    @Column(insertable = false, updatable = false)
    private String title;

    @Column(insertable = false, updatable = false)
    private String message;

    @Column(name = "related_type", insertable = false, updatable = false)
    private String relatedType;

    @Column(name = "related_id", insertable = false, updatable = false)
    private String relatedId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
