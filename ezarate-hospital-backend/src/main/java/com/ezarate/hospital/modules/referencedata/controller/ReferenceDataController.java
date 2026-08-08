package com.ezarate.hospital.modules.referencedata.controller;

import com.ezarate.hospital.modules.laborder.repository.LabTestCatalogRepository;
import com.ezarate.hospital.modules.referencedata.dto.DoctorDirectoryEntry;
import com.ezarate.hospital.modules.referencedata.dto.LabTestCatalogResponse;
import com.ezarate.hospital.modules.referencedata.entity.MedicineCatalog;
import com.ezarate.hospital.modules.referencedata.repository.MedicineCatalogRepository;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;

@RestController
public class ReferenceDataController {

    private final MedicineCatalogRepository medicineRepository;
    private final LabTestCatalogRepository labTestCatalogRepository;
    private final UserRepository userRepository;

    public ReferenceDataController(
            MedicineCatalogRepository medicineRepository,
            LabTestCatalogRepository labTestCatalogRepository,
            UserRepository userRepository
    ) {
        this.medicineRepository = medicineRepository;
        this.labTestCatalogRepository = labTestCatalogRepository;
        this.userRepository = userRepository;
    }

    // Attending Physician options for Registration (Create Encounter,
    // Reassign Physician) and the admin Dashboard. Sourced from real doctor
    // *accounts* (users table, role = "doctor", status = "active") instead
    // of the old placeholder doctors_directory table — that table was
    // only ever seeded once by migration and nothing ever wrote a new
    // doctor into it, so accounts created after go-live never showed up
    // here even though they correctly appear everywhere else (Roles.jsx,
    // login, /api/doctors/directory). Same name format as
    // DoctorDirectoryEntry.from() below, so a doctor's name reads
    // identically in both dropdowns.
    @GetMapping("/api/doctors")
    public List<String> listDoctors() {
        return userRepository.findAllByRoleAndStatusOrderByFirstNameAscLastNameAsc("doctor", "active").stream()
                .map(DoctorDirectoryEntry::from)
                .map(DoctorDirectoryEntry::name)
                .sorted()
                .toList();
    }

    // Backs the Consultation Form's Certification section — same
    // read-for-everyone access as /api/doctors above, but sourced from
    // actual doctor *accounts* (users table) instead of the placeholder
    // doctors_directory table, since that's the only place a license
    // number actually lives (doctors enter it once in Account Settings).
    @GetMapping("/api/doctors/directory")
    public List<DoctorDirectoryEntry> listDoctorsDirectory() {
        return userRepository.findAllByRoleAndStatusOrderByFirstNameAscLastNameAsc("doctor", "active").stream()
                .map(DoctorDirectoryEntry::from)
                .sorted(Comparator.comparing(DoctorDirectoryEntry::name))
                .toList();
    }

    @GetMapping("/api/lab-tests")
    public List<LabTestCatalogResponse> listLabTests() {
        return labTestCatalogRepository.findAll().stream()
                .map(LabTestCatalogResponse::from)
                .sorted(Comparator.comparing(LabTestCatalogResponse::testName))
                .toList();
    }

    @GetMapping("/api/medicines")
    public List<String> listMedicines() {
        return medicineRepository.findAll().stream()
                .map(MedicineCatalog::getName)
                .sorted()
                .toList();
    }

    // Matches the "Medicines page: Admin + Pharmacist can add/remove
    // catalog entries" addendum — everyone else stays read-only.
    @PostMapping("/api/medicines")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public void addMedicine(@RequestBody String name) {
        medicineRepository.save(new MedicineCatalog(name));
    }

    @DeleteMapping("/api/medicines/{name}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public void removeMedicine(@PathVariable String name) {
        medicineRepository.deleteById(name);
    }
}