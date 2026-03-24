package ru.itplanet.trampline.auth.security

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component
import ru.itplanet.trampline.auth.exception.GlobalExceptionHandler.ErrorResponse
import java.nio.charset.StandardCharsets
import java.time.Instant

@Component
class ApiAccessDeniedHandler(
    private val objectMapper: ObjectMapper
) : AccessDeniedHandler {

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException
    ) {
        val body = ErrorResponse(
            code = "access_denied",
            message = "Access denied",
            timestamp = Instant.now()
        )

        response.status = HttpStatus.FORBIDDEN.value()
        response.characterEncoding = StandardCharsets.UTF_8.name()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.writer.write(objectMapper.writeValueAsString(body))
    }
}
