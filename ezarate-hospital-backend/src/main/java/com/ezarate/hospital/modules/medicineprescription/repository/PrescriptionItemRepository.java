package com.ezarate.hospital.modules.medicineprescription.repository;

import com.ezarate.hospital.modules.medicineprescription.entity.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, UUID> {
    List<PrescriptionItem> findByPrescriptionId(String prescriptionId);
}
