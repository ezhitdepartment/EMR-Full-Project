package com.ezarate.hospital.modules.patient.repository;

import com.ezarate.hospital.modules.patient.entity.PatientGuardian;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PatientGuardianRepository extends JpaRepository<PatientGuardian, UUID> {
}
