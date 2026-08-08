package com.ezarate.hospital.modules.patientdocument.service;

import com.ezarate.hospital.modules.patient.exception.PatientNotFoundException;
import com.ezarate.hospital.modules.patient.repository.PatientRepository;
import com.ezarate.hospital.modules.patientdocument.dto.PatientDocumentRequest;
import com.ezarate.hospital.modules.patientdocument.dto.PatientDocumentResponse;
import com.ezarate.hospital.modules.patientdocument.entity.PatientDocument;
import com.ezarate.hospital.modules.patientdocument.exception.InvalidDocTypeException;
import com.ezarate.hospital.modules.patientdocument.repository.PatientDocumentRepository;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PatientDocumentService {

    private final PatientDocumentRepository documentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final EntityManager entityManager;

    public PatientDocumentService(
            PatientDocumentRepository documentRepository,
            PatientRepository patientRepository,
            UserRepository userRepository,
            CurrentUserProvider currentUserProvider,
            EntityManager entityManager
    ) {
        this.documentRepository = documentRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public PatientDocumentResponse get(String hospitalNo, String docType) {
        InvalidDocTypeException.validate(docType);
        var id = new PatientDocument.PatientDocumentId(hospitalNo, docType);
        return documentRepository.findById(id)
                .map(PatientDocumentResponse::from)
                // No row yet is the normal, expected first-open state (EMR/
                // Discharge/etc. auto-fill client-side and only get saved on
                // first actual edit) — an empty shell, not a 404.
                .orElseGet(() -> PatientDocumentResponse.empty(hospitalNo, docType));
    }

    @Transactional(readOnly = true)
    public List<PatientDocumentResponse> listForPatient(String hospitalNo) {
        return documentRepository.findByHospitalNo(hospitalNo).stream()
                .map(PatientDocumentResponse::from)
                .toList();
    }

    @Transactional
    public PatientDocumentResponse save(String hospitalNo, String docType, PatientDocumentRequest request) {
        InvalidDocTypeException.validate(docType);

        patientRepository.findByHospitalNo(hospitalNo)
                .orElseThrow(() -> new PatientNotFoundException(hospitalNo));

        var id = new PatientDocument.PatientDocumentId(hospitalNo, docType);
        PatientDocument document = documentRepository.findById(id)
                .orElseGet(() -> PatientDocument.builder().hospitalNo(hospitalNo).docType(docType).build());

        document.setData(request.data());

        Optional<UUID> currentUserId = currentUserProvider.currentUserId();
        if (currentUserId.isPresent()) {
            document.setUpdatedBy(userRepository.getReferenceById(currentUserId.get()));
        }

        document = documentRepository.saveAndFlush(document);
        entityManager.refresh(document);
        return PatientDocumentResponse.from(document);
    }
}
