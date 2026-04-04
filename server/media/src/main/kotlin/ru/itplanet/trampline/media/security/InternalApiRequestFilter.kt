package ru.itplanet.trampline.media.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import ru.itplanet.trampline.commons.exception.ApiErrorResponseWriter
import ru.itplanet.trampline.media.config.InternalApiProperties

@Component
class InternalApiRequestFilter(
    private val internalApiProperties: InternalApiProperties,
    private val apiErrorResponseWriter: ApiErrorResponseWriter,
) : OncePerRequestFilter() {

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        return !request.servletPath.startsWith("/internal/")
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val apiKey = request.getHeader(INTERNAL_API_KEY_HEADER)

        if (apiKey.isNullOrBlank() || apiKey != internalApiProperties.apiKey) {
            apiErrorResponseWriter.write(
                response = response,
                status = HttpStatus.UNAUTHORIZED,
                message = "Некорректный внутренний API-ключ",
                code = "invalid_internal_api_key",
            )
            return
        }

        val authentication = UsernamePasswordAuthenticationToken(
            "internal",
            null,
            listOf(SimpleGrantedAuthority("ROLE_INTERNAL")),
        )

        SecurityContextHolder.getContext().authentication = authentication
        filterChain.doFilter(request, response)
    }

    companion object {
        private const val INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key"
    }
}
