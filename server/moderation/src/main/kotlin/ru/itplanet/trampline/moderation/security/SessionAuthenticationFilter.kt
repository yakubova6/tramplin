package ru.itplanet.trampline.moderation.security

import feign.FeignException
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import ru.itplanet.trampline.commons.exception.ApiErrorResponseWriter
import ru.itplanet.trampline.moderation.client.AuthServiceClient

@Component
class SessionAuthenticationFilter(
    private val authServiceClient: AuthServiceClient,
    private val apiErrorResponseWriter: ApiErrorResponseWriter,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        val path = request.servletPath

        if (path == "/error") {
            return true
        }

        if (path.startsWith("/internal/")) {
            return true
        }

        if (request.method == HttpMethod.OPTIONS.name()) {
            return true
        }

        return false
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        if (SecurityContextHolder.getContext().authentication != null) {
            filterChain.doFilter(request, response)
            return
        }

        val cookieHeader = request.getHeader(HttpHeaders.COOKIE)
        if (cookieHeader.isNullOrBlank()) {
            filterChain.doFilter(request, response)
            return
        }

        try {
            val authResponse = authServiceClient.me()
            val user = authResponse.user

            val principal = AuthenticatedUser(
                userId = user.id,
                email = user.email,
                role = user.role,
            )

            val authorities = listOf(
                SimpleGrantedAuthority("ROLE_${user.role.name}"),
            )

            val authentication = UsernamePasswordAuthenticationToken(
                principal,
                null,
                authorities,
            )
            authentication.details = WebAuthenticationDetailsSource().buildDetails(request)

            SecurityContextHolder.getContext().authentication = authentication
            filterChain.doFilter(request, response)
        } catch (ex: FeignException) {
            SecurityContextHolder.clearContext()

            if (ex.status() == HttpServletResponse.SC_UNAUTHORIZED ||
                ex.status() == HttpServletResponse.SC_FORBIDDEN
            ) {
                filterChain.doFilter(request, response)
                return
            }

            log.error("Сервис авторизации недоступен", ex)
            writeAuthServiceUnavailable(response)
        } catch (ex: Exception) {
            SecurityContextHolder.clearContext()
            log.error("Непредвиденная ошибка аутентификации", ex)
            writeAuthServiceUnavailable(response)
        }
    }

    private fun writeAuthServiceUnavailable(response: HttpServletResponse) {
        apiErrorResponseWriter.write(
            response = response,
            status = HttpStatus.SERVICE_UNAVAILABLE,
            message = "Сервис авторизации временно недоступен",
            code = "auth_service_unavailable",
        )
    }
}
