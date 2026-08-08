package com.ezarate.hospital.modules.laborder.repository;

import com.ezarate.hospital.modules.laborder.entity.LabTestCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LabTestCatalogRepository extends JpaRepository<LabTestCatalog, String> {
}
