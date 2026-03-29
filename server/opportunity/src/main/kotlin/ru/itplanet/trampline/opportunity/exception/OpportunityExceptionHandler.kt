package ru.itplanet.trampline.opportunity.controller

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import ru.itplanet.trampline.opportunity.exception.EmployerOpportunityCreationNotAllowedException
import java.time.Instant

@RestControllerAdvice
class OpportunityExceptionHandler {

    @ExceptionHandler(EmployerOpportunityCreationNotAllowedException::class)
    fun handleEmployerOpportunityCreationNotAllowed(
        ex: EmployerOpportunityCreationNotAllowedException,
    ): ResponseEntity<Map<String, Any>> {
        val status = HttpStatus.FORBIDDEN

        return ResponseEntity.status(status)
            .body(
                linkedMapOf(
                    "status" to status.value(),
                    "error" to status.reasonPhrase,
                    "message" to (ex.message ?: "Forbidden"),
                    "details" to emptyMap<String, Any>(),
                    "timestamp" to Instant.now().toString(),
                ),
            )
    }
}
