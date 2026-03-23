package ru.itplanet.trampline.auth.exception

import com.fasterxml.jackson.module.kotlin.MissingKotlinParameterException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.Instant

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(UserAlreadyExistsException::class, DataIntegrityViolationException::class)
    fun handleConflict(): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.CONFLICT,
            code = "conflict",
            message = "User with this email already exists"
        )
    }

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(ex: InvalidCredentialsException): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.UNAUTHORIZED,
            code = "invalid_credentials",
            message = ex.message ?: "Invalid credentials"
        )
    }

    @ExceptionHandler(InvalidSessionException::class)
    fun handleInvalidSession(ex: InvalidSessionException): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.UNAUTHORIZED,
            code = "invalid_session",
            message = ex.message ?: "Invalid session"
        )
    }

    @ExceptionHandler(RegistrationRoleNotAllowedException::class)
    fun handleRegistrationRole(ex: RegistrationRoleNotAllowedException): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.BAD_REQUEST,
            code = "registration_role_not_allowed",
            message = ex.message ?: "Only applicant or employer can register"
        )
    }

    @ExceptionHandler(UserNotFoundException::class)
    fun handleUserNotFound(ex: UserNotFoundException): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.NOT_FOUND,
            code = "user_not_found",
            message = ex.message ?: "User not found"
        )
    }

    @ExceptionHandler(UserStatusChangeNotAllowedException::class)
    fun handleStatusChangeNotAllowed(ex: UserStatusChangeNotAllowedException): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.FORBIDDEN,
            code = "status_change_not_allowed",
            message = ex.message ?: "Status change is not allowed"
        )
    }

    @ExceptionHandler(UserStatusTransitionNotAllowedException::class)
    fun handleStatusTransitionNotAllowed(ex: UserStatusTransitionNotAllowedException): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.BAD_REQUEST,
            code = "status_transition_not_allowed",
            message = ex.message ?: "Status transition is not allowed"
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val message = ex.bindingResult.fieldErrors.firstOrNull()?.defaultMessage ?: "Validation failed"
        return build(
            status = HttpStatus.BAD_REQUEST,
            code = "validation_error",
            message = message
        )
    }

    @ExceptionHandler(HttpMessageNotReadableException::class, MissingKotlinParameterException::class)
    fun handleInvalidBody(): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.BAD_REQUEST,
            code = "invalid_request",
            message = "Request body is invalid or incomplete"
        )
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.FORBIDDEN,
            code = "access_denied",
            message = "Access denied"
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(): ResponseEntity<ErrorResponse> {
        return build(
            status = HttpStatus.INTERNAL_SERVER_ERROR,
            code = "internal_error",
            message = "Internal server error"
        )
    }

    private fun build(
        status: HttpStatus,
        code: String,
        message: String
    ): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(status)
            .body(
                ErrorResponse(
                    code = code,
                    message = message,
                    timestamp = Instant.now()
                )
            )
    }

    data class ErrorResponse(
        val code: String,
        val message: String,
        val timestamp: Instant
    )
}
