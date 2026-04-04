package ru.itplanet.trampline.media.security

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.exception.ApiErrorResponseWriter

@Component
class ApiAuthenticationEntryPoint(
    private val apiErrorResponseWriter: ApiErrorResponseWriter,
) : AuthenticationEntryPoint {

    override fun commence(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authException: AuthenticationException,
    ) {
        apiErrorResponseWriter.write(
            response = response,
            status = HttpStatus.UNAUTHORIZED,
            message = "Требуется авторизация",
            code = "unauthorized",
        )
    }
}
