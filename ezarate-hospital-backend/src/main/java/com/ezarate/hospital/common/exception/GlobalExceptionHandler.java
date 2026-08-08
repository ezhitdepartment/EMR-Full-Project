package com.ezarate.hospital.common.exception;

import com.ezarate.hospital.common.dto.ErrorResponse;
import com.ezarate.hospital.modules.admittedpatient.exception.AdmittedPatientNotFoundException;
import com.ezarate.hospital.modules.auditlog.exception.LoginEventNotFoundException;
import com.ezarate.hospital.modules.auth.exception.AccountSuspendedException;
import com.ezarate.hospital.modules.auth.exception.InvalidCredentialsException;
import com.ezarate.hospital.modules.auth.exception.RoleMismatchException;
import com.ezarate.hospital.modules.auth.exception.WrongPasswordException;
import com.ezarate.hospital.modules.consultation.exception.InvalidAuthorRoleException;
import com.ezarate.hospital.modules.encounter.exception.EncounterNotFoundException;
import com.ezarate.hospital.modules.encounter.exception.InvalidPatientTypeException;
import com.ezarate.hospital.modules.laborder.exception.InvalidFormTypeAccessException;
import com.ezarate.hospital.modules.laborder.exception.LabOrderNotFoundException;
import com.ezarate.hospital.modules.laborder.exception.LabOrderTestNotFoundException;
import com.ezarate.hospital.modules.laborder.exception.UnknownLabTestException;
import com.ezarate.hospital.modules.medicineprescription.exception.MedicinePrescriptionNotFoundException;
import com.ezarate.hospital.modules.patient.exception.PatientNotFoundException;
import com.ezarate.hospital.modules.patientdocument.exception.InvalidDocTypeException;
import com.ezarate.hospital.modules.report.exception.GeneratedReportNotFoundException;
import com.ezarate.hospital.modules.user.exception.CannotModifySelfException;
import com.ezarate.hospital.modules.user.exception.DuplicateUserException;
import com.ezarate.hospital.modules.user.exception.InvalidAdminConfirmationException;
import com.ezarate.hospital.modules.user.exception.InvalidRoleException;
import com.ezarate.hospital.modules.user.exception.UserNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(InvalidCredentialsException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(AccountSuspendedException.class)
    public ResponseEntity<ErrorResponse> handleAccountSuspended(AccountSuspendedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(RoleMismatchException.class)
    public ResponseEntity<ErrorResponse> handleRoleMismatch(RoleMismatchException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(WrongPasswordException.class)
    public ResponseEntity<ErrorResponse> handleWrongPassword(WrongPasswordException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(PatientNotFoundException.class)
    public ResponseEntity<ErrorResponse> handlePatientNotFound(PatientNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(AdmittedPatientNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleAdmittedPatientNotFound(AdmittedPatientNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidAuthorRoleException.class)
    public ResponseEntity<ErrorResponse> handleInvalidAuthorRole(InvalidAuthorRoleException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(EncounterNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEncounterNotFound(EncounterNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(LoginEventNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleLoginEventNotFound(LoginEventNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidPatientTypeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPatientType(InvalidPatientTypeException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(LabOrderNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleLabOrderNotFound(LabOrderNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(LabOrderTestNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleLabOrderTestNotFound(LabOrderTestNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(UnknownLabTestException.class)
    public ResponseEntity<ErrorResponse> handleUnknownLabTest(UnknownLabTestException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidFormTypeAccessException.class)
    public ResponseEntity<ErrorResponse> handleInvalidFormTypeAccess(InvalidFormTypeAccessException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(MedicinePrescriptionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleMedicinePrescriptionNotFound(MedicinePrescriptionNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidDocTypeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidDocType(InvalidDocTypeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(GeneratedReportNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleGeneratedReportNotFound(GeneratedReportNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(DuplicateUserException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateUser(DuplicateUserException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidRoleException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRole(InvalidRoleException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(InvalidAdminConfirmationException.class)
    public ResponseEntity<ErrorResponse> handleInvalidAdminConfirmation(InvalidAdminConfirmationException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(CannotModifySelfException.class)
    public ResponseEntity<ErrorResponse> handleCannotModifySelf(CannotModifySelfException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fieldError -> fieldError.getDefaultMessage())
                .orElse("Invalid request.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(message));
    }

    @ExceptionHandler(NotDeletableException.class)
    public ResponseEntity<ErrorResponse> handleNotDeletable(NotDeletableException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(e.getMessage()));
    }

    // Safety net for "Delete Permanently" actions (Archive.jsx) — if a
    // record somehow still has something else pointing at it (a foreign
    // key without ON DELETE SET NULL/CASCADE), surface a clear message
    // instead of a raw 500 / stack trace.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("Can't delete this record — other records still reference it."));
    }
}