package com.ezarate.hospital.modules.referencedata.repository;

import com.ezarate.hospital.modules.referencedata.entity.MedicineCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicineCatalogRepository extends JpaRepository<MedicineCatalog, String> {
}
