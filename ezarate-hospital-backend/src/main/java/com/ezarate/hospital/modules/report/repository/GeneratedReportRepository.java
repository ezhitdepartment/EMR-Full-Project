package com.ezarate.hospital.modules.report.repository;

import com.ezarate.hospital.modules.report.entity.GeneratedReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GeneratedReportRepository extends JpaRepository<GeneratedReport, String> {

    // Backs loadReports() — Reports.jsx and Archive.jsx both just want the
    // full history, newest-generated first; no pagination on this list today.
    List<GeneratedReport> findAllByOrderByGeneratedAtDesc();
}
