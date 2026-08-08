package com.ezarate.hospital.modules.notification.repository;

import com.ezarate.hospital.modules.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // target_roles is a Postgres text[] — "= ANY(...)" is the array
    // containment check. Every row here is trigger-created (see
    // V11__notifications.sql), this repository never writes.
    @Query(
        value = "SELECT * FROM notifications WHERE :role = ANY(target_roles) ORDER BY created_at DESC",
        countQuery = "SELECT count(*) FROM notifications WHERE :role = ANY(target_roles)",
        nativeQuery = true
    )
    Page<Notification> findForRole(@Param("role") String role, Pageable pageable);

    @Query(
        value = "SELECT count(*) FROM notifications n WHERE :role = ANY(n.target_roles) " +
                "AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = :userId)",
        nativeQuery = true
    )
    long countUnreadForUser(@Param("role") String role, @Param("userId") UUID userId);
}
