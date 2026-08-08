package com.ezarate.hospital.modules.auditlog.repository;

import com.ezarate.hospital.modules.auditlog.entity.LoginEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LoginEventRepository extends JpaRepository<LoginEvent, UUID> {

    Page<LoginEvent> findAllByOrderByLoggedInAtDesc(Pageable pageable);
}
