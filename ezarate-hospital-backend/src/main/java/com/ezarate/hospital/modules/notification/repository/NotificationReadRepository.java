package com.ezarate.hospital.modules.notification.repository;

import com.ezarate.hospital.modules.notification.entity.NotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

public interface NotificationReadRepository
        extends JpaRepository<NotificationRead, NotificationRead.NotificationReadId> {

    // Batch lookup so listing a page of notifications doesn't need one
    // existsById() query per row — one query for the whole page instead.
    @Query("SELECT nr.notificationId FROM NotificationRead nr " +
           "WHERE nr.userId = :userId AND nr.notificationId IN :notificationIds")
    Set<UUID> findReadNotificationIds(
            @Param("userId") UUID userId,
            @Param("notificationIds") Collection<UUID> notificationIds
    );
}
