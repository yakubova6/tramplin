package ru.itplanet.trampline.interaction.exception

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import ru.itplanet.trampline.interaction.controller.InteractionController
import java.time.OffsetDateTime

@RestControllerAdvice(assignableTypes = [InteractionController::class])
class InteractionExceptionHandler {
    @ExceptionHandler(InteractionException.BadRequest::class)
    fun handleBadRequest(
        ex: InteractionException.BadRequest,
    ): ResponseEntity<Map<String, Any>> {
        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = ex.message ?: "Request body is invalid",
        )
    }

    @ExceptionHandler(InteractionException.Conflict::class)
    fun handleConflict(
        ex: InteractionException.Conflict,
    ): ResponseEntity<Map<String, Any>> {
        return buildResponse(
            status = HttpStatus.CONFLICT,
            message = ex.message ?: "Conflict",
        )
    }

    private fun buildResponse(
        status: HttpStatus,
        message: String,
    ): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(status).body(
            mapOf(
                "status" to status.value(),
                "error" to status.reasonPhrase,
                "message" to message,
                "details" to emptyMap<String, Any>(),
                "timestamp" to OffsetDateTime.now(),
            ),
        )
    }
}
