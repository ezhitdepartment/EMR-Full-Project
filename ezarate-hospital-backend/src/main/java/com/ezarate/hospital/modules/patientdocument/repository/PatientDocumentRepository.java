package com.ezarate.hospital.modules.patientdocument.repository;

import com.ezarate.hospital.modules.patientdocument.entity.PatientDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatientDocumentRepository
        extends JpaRepository<PatientDocument, PatientDocument.PatientDocumentId> {

    List<PatientDocument> findByHospitalNo(String hospitalNo);
}
