package com.ezarate.hospital.modules.notification.controller;

import com.ezarate.hospital.modules.notification.dto.NotificationResponse;
import com.ezarate.hospital.modules.notification.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // Scoped to the current user's role automatically — no roleId param needed,
    // matches how target_roles was always meant to be read (per-role feed).
    @GetMapping("/api/notifications")
    public Page<NotificationResponse> list(@PageableDefault(size = 20) Pageable pageable) {
        return notificationService.listForCurrentUser(pageable);
    }

    @GetMapping("/api/notifications/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", notificationService.unreadCount());
    }

    @PostMapping("/api/notifications/{id}/read")
    public void markRead(@PathVariable UUID id) {
        notificationService.markRead(id);
    }
}
