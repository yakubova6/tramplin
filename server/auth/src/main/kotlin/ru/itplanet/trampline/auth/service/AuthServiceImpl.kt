package ru.itplanet.trampline.auth.service

import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.auth.converter.UserConverter
import ru.itplanet.trampline.auth.dao.UserDao
import ru.itplanet.trampline.auth.model.Role
import ru.itplanet.trampline.auth.model.Status
import ru.itplanet.trampline.auth.model.TokenPayload
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.util.PasswordEncoder
import java.time.Instant

@Primary
@Service
class AuthServiceImpl(
    private val userDao: UserDao,
    private val userConverter: UserConverter,
    private val sessionService: SessionService
) : AuthService {
    @Transactional
    override fun register(request: Registration): AuthResponse {
        userDao.findByEmail(request.email)
            ?.let { throw RuntimeException("User with this username or email exists") }

        if (!(request.role == Role.EMPLOYER || request.role == Role.APPLICANT)) {
            throw RuntimeException("Only applicant or employer can register")
        }

        val status =
            if (request.role == Role.EMPLOYER) Status.PENDING_VERIFICATION else Status.ACTIVE

        val registration = Registration(
            displayName = request.displayName,
            email = request.email,
            password = PasswordEncoder.encode(request.password),
            role = request.role,
            status = status
        )

        val newUser = userDao.save(userConverter.toUserDto(registration))
        val sessionId = sessionService.createSession(newUser.id!!)
        return AuthResponse(
            sessionId = sessionId,
            user = userConverter.fromDtoToUser(newUser)
        )
    }

    @Transactional
    override fun login(request: Authorization): AuthResponse {
        val userDto = userDao.findByEmail(request.email)
            ?: throw RuntimeException("User not found")

        if (!PasswordEncoder.matches(request.password, userDto.password)) {
            throw RuntimeException("Incorrect password")
        }

        return AuthResponse(
            sessionId = sessionService.createSession(userDto.id!!),
            user = userConverter.fromDtoToUser(userDto)
        )
    }

    override fun validateSession(sessionId: String?): TokenPayload {
        val tokenPayload = sessionService.getSession(sessionId)
        if (tokenPayload.expires.isBefore(Instant.now())) {
            sessionService.deleteSession(sessionId)
            throw RuntimeException("Invalid session")
        }
        return sessionService.extendSession(sessionId)
    }
}