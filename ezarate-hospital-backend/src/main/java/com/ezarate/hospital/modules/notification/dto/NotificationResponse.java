package com.ezarate.hospital.modules.notification.dto;

import com.ezarate.hospital.modules.notification.entity.Notification;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String type,
        String title,
        String message,
        String relatedType,
        String relatedId,
        OffsetDateTime createdAt,
        boolean read
) {
    public static NotificationResponse from(Notification n, boolean read) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getTitle(), n.getMessage(),
                n.getRelatedType(), n.getRelatedId(), n.getCreatedAt(), read
        );
    }
}
