package ru.itplanet.trampline.geo.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import ru.itplanet.trampline.geo.config.InternalApiProperties
import java.nio.charset.StandardCharsets
import java.time.Instant

@Component
class InternalApiRequestFilter(
    private val internalApiProperties: InternalApiProperties
) : OncePerRequestFilter() {

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        return !request.servletPath.startsWith("/internal/")
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val apiKey = request.getHeader(INTERNAL_API_KEY_HEADER)

        if (apiKey.isNullOrBlank() || apiKey != internalApiProperties.apiKey) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            response.characterEncoding = StandardCharsets.UTF_8.name()
            response.contentType = MediaType.APPLICATION_JSON_VALUE
            response.writer.write(
                """
                {
                  "code": "invalid_internal_api_key",
                  "message": "Invalid internal api key",
                  "timestamp": "${Instant.now()}"
                }
                """.trimIndent()
            )
            return
        }

        val authentication = UsernamePasswordAuthenticationToken(
            "internal",
            null,
            listOf(SimpleGrantedAuthority("ROLE_INTERNAL"))
        )

        SecurityContextHolder.getContext().authentication = authentication
        filterChain.doFilter(request, response)
    }

    companion object {
        private const val INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key"
    }
}
