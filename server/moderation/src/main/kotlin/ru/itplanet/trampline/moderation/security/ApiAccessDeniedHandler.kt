package ru.itplanet.trampline.moderation.security

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.exception.ApiErrorResponseWriter

@Component
class ApiAccessDeniedHandler(
    private val apiErrorResponseWriter: ApiErrorResponseWriter,
) : AccessDeniedHandler {

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException,
    ) {
        apiErrorResponseWriter.write(
            response = response,
            status = HttpStatus.FORBIDDEN,
            message = "Доступ запрещён",
            code = "access_denied",
        )
    }
}
