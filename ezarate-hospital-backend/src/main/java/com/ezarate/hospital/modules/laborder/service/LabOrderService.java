package com.ezarate.hospital.modules.laborder.service;

import com.ezarate.hospital.common.exception.NotDeletableException;
import com.ezarate.hospital.modules.encounter.entity.Encounter;
import com.ezarate.hospital.modules.encounter.exception.EncounterNotFoundException;
import com.ezarate.hospital.modules.encounter.repository.EncounterRepository;
import com.ezarate.hospital.modules.laborder.dto.*;
import com.ezarate.hospital.modules.laborder.entity.LabOrder;
import com.ezarate.hospital.modules.laborder.entity.LabOrderTest;
import com.ezarate.hospital.modules.laborder.entity.LabTestCatalog;
import com.ezarate.hospital.modules.laborder.exception.*;
import com.ezarate.hospital.modules.laborder.repository.LabOrderRepository;
import com.ezarate.hospital.modules.laborder.repository.LabOrderTestRepository;
import com.ezarate.hospital.modules.laborder.repository.LabTestCatalogRepository;
import com.ezarate.hospital.modules.patient.entity.Patient;
import com.ezarate.hospital.modules.patient.exception.PatientNotFoundException;
import com.ezarate.hospital.modules.patient.repository.PatientRepository;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class LabOrderService {

    // Mirrors current_user_can_access_form_type().
    private static final Map<String, List<String>> ROLE_FORM_TYPES = Map.of(
            "med_tech", List.of("Laboratory"),
            "xray_tech", List.of("X-Ray", "Ultrasound & Imaging")
    );

    private final LabOrderRepository labOrderRepository;
    private final LabOrderTestRepository labOrderTestRepository;
    private final LabTestCatalogRepository labTestCatalogRepository;
    private final PatientRepository patientRepository;
    private final EncounterRepository encounterRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    @PersistenceContext
    private EntityManager entityManager;

    public LabOrderService(
            LabOrderRepository labOrderRepository,
            LabOrderTestRepository labOrderTestRepository,
            LabTestCatalogRepository labTestCatalogRepository,
            PatientRepository patientRepository,
            EncounterRepository encounterRepository,
            UserRepository userRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.labOrderRepository = labOrderRepository;
        this.labOrderTestRepository = labOrderTestRepository;
        this.labTestCatalogRepository = labTestCatalogRepository;
        this.patientRepository = patientRepository;
        this.encounterRepository = encounterRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    // ------------------------------------------------------------------
    // Create / upsert
    // ------------------------------------------------------------------

    @Transactional
    public LabOrderResponse create(LabOrderCreateRequest request) {
        Patient patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> new PatientNotFoundException(request.patientId()));

        Encounter encounter = null;
        if (request.encounterId() != null && !request.encounterId().isBlank()) {
            encounter = encounterRepository.findById(request.encounterId())
                    .orElseThrow(() -> new EncounterNotFoundException(request.encounterId()));
        }

        LabOrder order = LabOrder.builder()
                .id(generateId())
                .patient(patient)
                .encounter(encounter)
                .build();
        Optional<UUID> currentUserId = currentUserProvider.currentUserId();
        if (currentUserId.isPresent()) {
            order.setCreatedBy(userRepository.getReferenceById(currentUserId.get()));
        }
        order = labOrderRepository.save(order);

        addTests(order, request.diagnostics(), request.testDetails(), request.testCodes());

        entityManager.flush();
        entityManager.refresh(order);
        return LabOrderResponse.from(order);
    }

    // Backs upsertLabOrderForEncounter(): syncs the ONE order tied to a
    // registration instead of always inserting a new one. Newly checked
    // tests are added; unchecked tests are removed ONLY if still PENDING
    // (work already done — DONE/CANCELLED — is preserved even if later
    // unchecked); tests still checked have their testDetail refreshed.
    @Transactional
    public LabOrderResponse upsertForEncounter(String encounterId, LabOrderUpsertForEncounterRequest request) {
        Encounter encounter = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new EncounterNotFoundException(encounterId));

        List<String> diagnostics = request.diagnostics() == null ? List.of() : request.diagnostics();
        Map<String, String> testDetails = request.testDetails() == null ? Map.of() : request.testDetails();

        Optional<LabOrder> existing = labOrderRepository.findByEncounterId(encounterId);
        if (existing.isEmpty()) {
            return create(new LabOrderCreateRequest(request.patientId(), encounterId, diagnostics, testDetails, null));
        }

        LabOrder order = existing.get();
        List<LabOrderTest> currentTests = labOrderTestRepository.findByOrderId(order.getId());
        Set<String> existingNames = currentTests.stream().map(LabOrderTest::getTestName).collect(java.util.stream.Collectors.toSet());
        Set<String> nextNames = new HashSet<>(diagnostics);

        // Newly checked -> add.
        List<String> toAdd = diagnostics.stream().filter(name -> !existingNames.contains(name)).toList();
        addTests(order, toAdd, testDetails, null);

        // Unchecked & still PENDING -> remove.
        for (LabOrderTest t : currentTests) {
            if (!nextNames.contains(t.getTestName()) && "PENDING".equals(t.getStatus())) {
                labOrderTestRepository.delete(t);
            }
        }

        // Still checked -> refresh testDetail if it changed.
        for (LabOrderTest t : currentTests) {
            if (!nextNames.contains(t.getTestName())) continue;
            String nextDetail = testDetails.get(t.getTestName());
            if (!Objects.equals(nextDetail, t.getTestDetail())) {
                t.setTestDetail(nextDetail);
                labOrderTestRepository.save(t);
            }
        }

        entityManager.flush();
        entityManager.refresh(order);
        return LabOrderResponse.from(order);
    }

    private void addTests(LabOrder order, List<String> names, Map<String, String> testDetails, Map<String, String> testCodes) {
        if (names == null) return;
        for (String name : names) {
            LabTestCatalog catalogEntry = labTestCatalogRepository.findById(name)
                    .orElseThrow(() -> new UnknownLabTestException(name));

            LabOrderTest test = LabOrderTest.builder()
                    .order(order)
                    .testName(catalogEntry.getTestName())
                    .code(testCodes != null ? testCodes.get(name) : null)
                    .testDetail(testDetails != null ? testDetails.get(name) : null)
                    .build();
            labOrderTestRepository.save(test);
        }
    }

    // ------------------------------------------------------------------
    // Read / search
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public LabOrderResponse getById(String id) {
        LabOrder order = labOrderRepository.findById(id)
                .orElseThrow(() -> new LabOrderNotFoundException(id));
        return LabOrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public List<LabOrderResponse> getHistoryByPatient(UUID patientId) {
        return labOrderRepository.findByPatientIdOrderByDateCreatedDesc(patientId).stream()
                .map(LabOrderResponse::from)
                .toList();
    }

    // Backs the Admitted Patients module's "Ancillaries Done" section on
    // the Medical Abstract (see AdmittedPatientService.resolveSources()) —
    // mirrors resolveMedicalAbstractSources()'s direct `lab_orders` query
    // in the old utils/admittedPatients.js. Returns an empty list rather
    // than 404ing when the registration never had a lab order at all,
    // since "no ancillaries ordered" is a normal, expected case here.
    @Transactional(readOnly = true)
    public List<LabOrderTestResponse> getTestsByEncounterId(String encounterId) {
        return labOrderRepository.findByEncounterId(encounterId)
                .map(order -> order.getTests().stream().map(LabOrderTestResponse::from).toList())
                .orElse(List.of());
    }

    // Backs the Lab Orders / X-Ray Orders list pages.
    @Transactional(readOnly = true)
    public Page<LabOrderResponse> search(String query, Pageable pageable) {
        String role = currentUserProvider.currentUserRole().orElse(null);
        List<String> formTypes = ROLE_FORM_TYPES.getOrDefault(role, List.of());
        boolean restricted = !formTypes.isEmpty();
        return labOrderRepository.search(query, restricted, formTypes, pageable).map(LabOrderResponse::from);
    }

    // ------------------------------------------------------------------
    // Individual test lines
    // ------------------------------------------------------------------

    @Transactional
    public LabOrderTestResponse updateTest(String orderId, UUID testId, LabOrderTestUpdateRequest request) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new LabOrderNotFoundException(orderId));
        LabOrderTest test = order.getTests().stream()
                .filter(t -> t.getId().equals(testId))
                .findFirst()
                .orElseThrow(() -> new LabOrderTestNotFoundException(testId));

        assertRoleCanAccessTest(test);

        if (request.status() != null) test.setStatus(request.status());
        if (request.queueStatus() != null) test.setQueueStatus(request.queueStatus());
        if (request.isReferred() != null) test.setIsReferred(request.isReferred());
        if (request.performedBy() != null) test.setPerformedBy(request.performedBy());
        if (request.datePerformed() != null) test.setDatePerformed(request.datePerformed());
        if (request.fee() != null) test.setFee(request.fee());
        if (request.remarks() != null) test.setRemarks(request.remarks());
        if (request.testDetail() != null) test.setTestDetail(request.testDetail());

        test = labOrderTestRepository.save(test);
        entityManager.flush();
        entityManager.refresh(test);
        return LabOrderTestResponse.from(test);
    }

    // Backs the Lab Queue page's WAITING <-> SERVING toggle.
    @Transactional
    public LabOrderTestResponse setQueueStatus(UUID testId, String queueStatus) {
        LabOrderTest test = labOrderTestRepository.findById(testId)
                .orElseThrow(() -> new LabOrderTestNotFoundException(testId));
        assertRoleCanAccessTest(test);
        test.setQueueStatus(queueStatus);
        test = labOrderTestRepository.save(test);
        return LabOrderTestResponse.from(test);
    }

    // Backs the Lab Queue page's list — every still-PENDING test in this
    // role's form-type scope, across all orders.
    @Transactional(readOnly = true)
    public List<LabOrderTestResponse> getQueue() {
        String role = currentUserProvider.currentUserRole().orElse(null);
        List<String> formTypes = ROLE_FORM_TYPES.get(role);
        List<String> testNames = formTypes != null
                ? labTestCatalogRepository.findAll().stream()
                .filter(c -> formTypes.contains(c.getFormType()))
                .map(LabTestCatalog::getTestName)
                .toList()
                : labTestCatalogRepository.findAll().stream().map(LabTestCatalog::getTestName).toList();

        return labOrderTestRepository.findByStatusAndTestNameIn("PENDING", testNames).stream()
                .map(LabOrderTestResponse::from)
                .toList();
    }

    // ------------------------------------------------------------------
    // Delete permanently
    // ------------------------------------------------------------------

    // Backs Archive.jsx's "Delete Permanently" button on the Cancelled Lab
    // Orders tab. Admin-only (see LabOrderController). A lab order has no
    // status column of its own — its effective status is derived from its
    // tests (mirrors getOrderStatus() in utils/labOrderDiagnostics.js), so
    // this only allows deleting an order whose tests are ALL cancelled.
    // Cascades to lab_order_tests and lab_order_test_files at both the JPA
    // level (CascadeType.ALL/orphanRemoval on LabOrder.tests) and the DB
    // level (ON DELETE CASCADE), so a single delete() here is sufficient.
    @Transactional
    public void deletePermanently(String orderId) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new LabOrderNotFoundException(orderId));

        List<LabOrderTest> tests = order.getTests();
        boolean allCancelled = !tests.isEmpty() && tests.stream()
                .allMatch(t -> "CANCELLED".equals(t.getStatus()));
        if (!allCancelled) {
            throw new NotDeletableException("Only fully cancelled lab orders can be permanently deleted.");
        }

        labOrderRepository.delete(order);
    }

    // ------------------------------------------------------------------
    // Diagnostic code generation
    // ------------------------------------------------------------------

    // "CBC-202607-0036" — backs CreateLabOrderModal/ViewLabOrderPage's
    // generateDiagnosticCode(), computed atomically via the
    // generate_lab_test_code() Postgres function (V12 migration) instead
    // of the old client-side "count existing codes + 1", which could
    // collide under two near-simultaneous submissions — the same class of
    // race the daily_id_counters table already fixes for order/encounter
    // IDs elsewhere in this schema.
    @Transactional
    public String generateDiagnosticCode(String testName) {
        if (!labTestCatalogRepository.existsById(testName)) {
            throw new UnknownLabTestException(testName);
        }
        return (String) entityManager
                .createNativeQuery("SELECT generate_lab_test_code(:testName)")
                .setParameter("testName", testName)
                .getSingleResult();
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    // "LAB-20260706-0018" — same atomic, race-safe Postgres function
    // encounters/consultations/medicine_prescriptions all use.
    private String generateId() {
        return (String) entityManager
                .createNativeQuery("SELECT generate_daily_sequence_id('LAB-')")
                .getSingleResult();
    }

    // Mirrors current_user_can_access_form_type() — med_tech/xray_tech can
    // only touch tests within their own scope; every other role
    // (unrestricted) passes through.
    private void assertRoleCanAccessTest(LabOrderTest test) {
        String role = currentUserProvider.currentUserRole().orElse(null);
        List<String> allowed = ROLE_FORM_TYPES.get(role);
        if (allowed == null) return;

        String formType = labTestCatalogRepository.findById(test.getTestName())
                .map(LabTestCatalog::getFormType)
                .orElse(null);
        if (!allowed.contains(formType)) {
            throw new InvalidFormTypeAccessException(
                    role + " cannot access " + formType + " tests (scoped to " + allowed + ")");
        }
    }
}