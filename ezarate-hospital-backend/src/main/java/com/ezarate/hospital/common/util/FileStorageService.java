package com.ezarate.hospital.common.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * Replaces Supabase Storage: every "bucket" is now just a subfolder under
 * app.storage.base-dir, which on the NAS deployment points at a mounted
 * share (see application-nas.yml) instead of local disk. Callers pass a
 * bucket name ("lab-order-files", "patient-photos", etc.) and a relative
 * path within it — the same two-part addressing Supabase Storage used, so
 * DB columns that already store a "storage_path" string keep meaning the
 * same thing, just resolved against a filesystem instead of an S3-style
 * bucket.
 */
@Service
public class FileStorageService {

    private final Path baseDir;

    public FileStorageService(@Value("${app.storage.base-dir}") String baseDir) {
        this.baseDir = Path.of(baseDir).toAbsolutePath().normalize();
    }

    public String store(String bucket, String relativePath, MultipartFile file) {
        Path target = resolve(bucket, relativePath);
        try {
            Files.createDirectories(target.getParent());
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new StorageException("Failed to store file at " + bucket + "/" + relativePath, e);
        }
        return relativePath;
    }

    public byte[] read(String bucket, String relativePath) {
        Path target = resolve(bucket, relativePath);
        try {
            return Files.readAllBytes(target);
        } catch (IOException e) {
            throw new StorageException("Failed to read file at " + bucket + "/" + relativePath, e);
        }
    }

    public void delete(String bucket, String relativePath) {
        Path target = resolve(bucket, relativePath);
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new StorageException("Failed to delete file at " + bucket + "/" + relativePath, e);
        }
    }

    // Guards against a relativePath like "../../etc/passwd" escaping the
    // bucket directory — resolve() then re-check the result is still
    // inside baseDir before returning it.
    private Path resolve(String bucket, String relativePath) {
        Path target = baseDir.resolve(bucket).resolve(relativePath).normalize();
        if (!target.startsWith(baseDir)) {
            throw new StorageException("Rejected path escaping storage root: " + bucket + "/" + relativePath, null);
        }
        return target;
    }

    public static class StorageException extends RuntimeException {
        public StorageException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
