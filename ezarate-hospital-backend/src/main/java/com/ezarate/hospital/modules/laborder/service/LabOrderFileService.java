package com.ezarate.hospital.modules.laborder.service;

import com.ezarate.hospital.common.util.FileStorageService;
import com.ezarate.hospital.modules.laborder.dto.LabOrderFileResponse;
import com.ezarate.hospital.modules.laborder.entity.LabOrder;
import com.ezarate.hospital.modules.laborder.entity.LabOrderFile;
import com.ezarate.hospital.modules.laborder.exception.LabOrderNotFoundException;
import com.ezarate.hospital.modules.laborder.repository.LabOrderFileRepository;
import com.ezarate.hospital.modules.laborder.repository.LabOrderRepository;
import com.ezarate.hospital.modules.user.repository.UserRepository;
import com.ezarate.hospital.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Replaces the old Supabase Storage "lab-order-files" bucket +
 * uploadLabOrderFile/deleteLabOrderFile/getLabOrderFileUrl trio —
 * files live on local disk / the NAS mount via FileStorageService.
 *
 * One shared upload area per ORDER now, not per individual diagnostic
 * test — see V15__lab_order_files_per_order.sql. A Med Tech/X-ray Tech
 * uploads results once for the whole order (e.g. a single scanned lab
 * slip covering every test on it) instead of re-uploading separately
 * under each diagnostic.
 */
@Service
public class LabOrderFileService {

    private static final String BUCKET = "lab-order-files";

    private final LabOrderRepository labOrderRepository;
    private final LabOrderFileRepository fileRepository;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public LabOrderFileService(
            LabOrderRepository labOrderRepository,
            LabOrderFileRepository fileRepository,
            FileStorageService fileStorageService,
            UserRepository userRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.labOrderRepository = labOrderRepository;
        this.fileRepository = fileRepository;
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public LabOrderFileResponse upload(String orderId, MultipartFile file) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new LabOrderNotFoundException(orderId));

        String relativePath = orderId + "/" + System.currentTimeMillis() + "-" + file.getOriginalFilename();
        fileStorageService.store(BUCKET, relativePath, file);

        LabOrderFile row = LabOrderFile.builder()
                .order(order)
                .fileName(file.getOriginalFilename())
                .storagePath(relativePath)
                .build();
        currentUserProvider.currentUserId()
                .ifPresent(userId -> row.setUploadedBy(userRepository.getReferenceById(userId)));

        return LabOrderFileResponse.from(fileRepository.save(row));
    }

    @Transactional(readOnly = true)
    public List<LabOrderFileResponse> listForOrder(String orderId) {
        return fileRepository.findByOrderId(orderId).stream().map(LabOrderFileResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public byte[] download(UUID fileId) {
        LabOrderFile row = fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("No file found with id " + fileId));
        return fileStorageService.read(BUCKET, row.getStoragePath());
    }

    @Transactional(readOnly = true)
    public LabOrderFile getMetadata(UUID fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("No file found with id " + fileId));
    }

    @Transactional
    public void delete(UUID fileId) {
        LabOrderFile row = fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("No file found with id " + fileId));
        fileStorageService.delete(BUCKET, row.getStoragePath());
        fileRepository.delete(row);
    }
}
