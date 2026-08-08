package com.ezarate.hospital.modules.notification.service;

import com.ezarate.hospital.modules.notification.dto.NotificationResponse;
import com.ezarate.hospital.modules.notification.entity.Notification;
import com.ezarate.hospital.modules.notification.entity.NotificationRead;
import com.ezarate.hospital.modules.notification.repository.NotificationReadRepository;
import com.ezarate.hospital.modules.notification.repository.NotificationRepository;
import com.ezarate.hospital.modules.user.entity.User;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationReadRepository notificationReadRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationReadRepository notificationReadRepository,
            UserRepository userRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.notificationRepository = notificationRepository;
        this.notificationReadRepository = notificationReadRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> listForCurrentUser(Pageable pageable) {
        UUID userId = currentUserProvider.requireCurrentUserId();
        String role = currentRole(userId);

        Page<Notification> page = notificationRepository.findForRole(role, pageable);

        List<UUID> ids = page.getContent().stream().map(Notification::getId).toList();
        Set<UUID> readIds = ids.isEmpty()
                ? Set.of()
                : notificationReadRepository.findReadNotificationIds(userId, ids);

        return page.map(n -> NotificationResponse.from(n, readIds.contains(n.getId())));
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        UUID userId = currentUserProvider.requireCurrentUserId();
        String role = currentRole(userId);
        return notificationRepository.countUnreadForUser(role, userId);
    }

    @Transactional
    public void markRead(UUID notificationId) {
        UUID userId = currentUserProvider.requireCurrentUserId();
        var id = new NotificationRead.NotificationReadId(notificationId, userId);

        if (!notificationReadRepository.existsById(id)) {
            notificationReadRepository.save(
                    NotificationRead.builder().notificationId(notificationId).userId(userId).build()
            );
        }
    }

    private String currentRole(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists: " + userId));
        return user.getRole();
    }
}
