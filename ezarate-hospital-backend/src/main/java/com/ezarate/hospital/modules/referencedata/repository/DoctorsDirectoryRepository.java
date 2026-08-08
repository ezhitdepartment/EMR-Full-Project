package com.ezarate.hospital.modules.referencedata.repository;

import com.ezarate.hospital.modules.referencedata.entity.DoctorsDirectory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorsDirectoryRepository extends JpaRepository<DoctorsDirectory, String> {
}
