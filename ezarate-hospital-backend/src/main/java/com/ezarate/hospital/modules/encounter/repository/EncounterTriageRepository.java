package com.ezarate.hospital.modules.encounter.repository;

import com.ezarate.hospital.modules.encounter.entity.EncounterTriage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EncounterTriageRepository extends JpaRepository<EncounterTriage, String> {
}