package com.ezarate.hospital.modules.laborder.repository;

import com.ezarate.hospital.modules.laborder.entity.LabOrderFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LabOrderFileRepository extends JpaRepository<LabOrderFile, UUID> {
    List<LabOrderFile> findByOrderId(String orderId);
}
