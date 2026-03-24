package ru.itplanet.trampline.auth.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import ru.itplanet.trampline.auth.config.SessionProperties
import ru.itplanet.trampline.auth.dao.UserDao
import ru.itplanet.trampline.auth.model.AuthenticatedUser
import ru.itplanet.trampline.auth.model.Status
import ru.itplanet.trampline.auth.service.SessionService

@Component
class SessionAuthenticationFilter(
    private val sessionService: SessionService,
    private val userDao: UserDao,
    private val sessionProperties: SessionProperties
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        if (SecurityContextHolder.getContext().authentication == null) {
            val sessionId = request.cookies
                ?.firstOrNull { it.name == sessionProperties.cookieName }
                ?.value

            val tokenPayload = sessionService.getSessionOrNull(sessionId)
            if (tokenPayload != null) {
                val user = userDao.findById(tokenPayload.userId).orElse(null)

                if (user == null || user.status == Status.BLOCKED || user.status == Status.DELETED) {
                    sessionService.deleteSession(sessionId)
                } else {
                    val principal = AuthenticatedUser(
                        userId = user.id!!,
                        email = user.email,
                        role = user.role,
                        status = user.status
                    )

                    val authorities = listOf(
                        SimpleGrantedAuthority("ROLE_${user.role.name}"),
                        SimpleGrantedAuthority("STATUS_${user.status.name}")
                    )

                    val authentication = UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        authorities
                    )
                    authentication.details = WebAuthenticationDetailsSource().buildDetails(request)

                    SecurityContextHolder.getContext().authentication = authentication
                }
            }
        }

        filterChain.doFilter(request, response)
    }
}
