package com.ezarate.hospital.modules.report.service;

import com.ezarate.hospital.modules.report.dto.ReportRequest;
import com.ezarate.hospital.modules.report.dto.ReportResponse;
import com.ezarate.hospital.modules.report.entity.GeneratedReport;
import com.ezarate.hospital.modules.report.exception.GeneratedReportNotFoundException;
import com.ezarate.hospital.modules.report.repository.GeneratedReportRepository;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReportService {

    private final GeneratedReportRepository reportRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final EntityManager entityManager;

    public ReportService(
            GeneratedReportRepository reportRepository,
            UserRepository userRepository,
            CurrentUserProvider currentUserProvider,
            EntityManager entityManager
    ) {
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> list() {
        return reportRepository.findAllByOrderByGeneratedAtDesc()
                .stream()
                .map(ReportResponse::from)
                .toList();
    }

    // Backs Archive.jsx's "Delete Permanently" button on the Archived
    // Generated Reports tab. Just a ledger row — no cancelled/archived
    // state precondition needed (unlike encounters/lab orders/
    // prescriptions), and no child rows to worry about.
    @Transactional
    public void deletePermanently(String id) {
        if (!reportRepository.existsById(id)) {
            throw new GeneratedReportNotFoundException(id);
        }
        reportRepository.deleteById(id);
    }

    // Mirrors addReport() in the frontend's utils/reports.js — one insert
    // per "Generate" click on the Reports page. rowCount/status/report data
    // itself was already computed client-side (see getReportRows() in
    // Reports.jsx); this just records that it happened.
    @Transactional
    public ReportResponse create(ReportRequest request) {
        GeneratedReport report = GeneratedReport.builder()
                .id(generateId())
                .reportType(request.reportType())
                .year(request.year())
                .generatedByName(request.generatedBy())
                .rowCount(request.rowCount() != null ? request.rowCount() : 0)
                .status(request.status() != null ? request.status() : "Completed")
                .build();

        currentUserProvider.currentUserId()
                .ifPresent(userId -> report.setGeneratedBy(userRepository.getReferenceById(userId)));

        GeneratedReport savedReport = reportRepository.save(report);

        // generated_at is DB-generated (insertable=false - defaults on
        // INSERT), same fix as ConsultationService.save(): without this the
        // entity still holds null for it, because Hibernate's first-level
        // cache hands back the same in-memory object instead of re-querying
        // Postgres.
        entityManager.flush();
        entityManager.refresh(savedReport);

        return ReportResponse.from(savedReport);
    }

    // "RPT-20260706-0003" - calls the same atomic, race-safe Postgres
    // function encounters/lab_orders/medicine_prescriptions/consultations
    // already use (see generate_daily_sequence_id() in
    // V3__id_generator_infra.sql), rather than reimplementing the counter
    // logic in Java.
    private String generateId() {
        return (String) entityManager
                .createNativeQuery("SELECT generate_daily_sequence_id('RPT-')")
                .getSingleResult();
    }
}
