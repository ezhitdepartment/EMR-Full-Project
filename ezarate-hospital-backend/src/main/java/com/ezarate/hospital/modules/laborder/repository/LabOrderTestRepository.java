package com.ezarate.hospital.modules.laborder.repository;

import com.ezarate.hospital.modules.laborder.entity.LabOrderTest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LabOrderTestRepository extends JpaRepository<LabOrderTest, UUID> {

    List<LabOrderTest> findByOrderId(String orderId);

    Optional<LabOrderTest> findByOrderIdAndTestName(String orderId, String testName);

    // Backs the Lab Queue page (WAITING/SERVING among still-PENDING tests),
    // scoped by formType the same way the order list is.
    List<LabOrderTest> findByStatusAndTestNameIn(String status, List<String> testNames);
}
