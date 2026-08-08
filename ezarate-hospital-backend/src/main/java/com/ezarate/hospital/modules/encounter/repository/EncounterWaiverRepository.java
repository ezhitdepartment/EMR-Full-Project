package com.ezarate.hospital.modules.encounter.repository;

import com.ezarate.hospital.modules.encounter.entity.EncounterWaiver;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EncounterWaiverRepository extends JpaRepository<EncounterWaiver, String> {
}