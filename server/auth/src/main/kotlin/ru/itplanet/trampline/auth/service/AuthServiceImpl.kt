package ru.itplanet.trampline.auth.service

import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.auth.converter.UserConverter
import ru.itplanet.trampline.auth.dao.UserDao
import ru.itplanet.trampline.auth.model.TokenPayload
import ru.itplanet.trampline.auth.model.request.Authorization
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
    override fun register(request: Authorization): AuthResponse {
        if (!request.validToRegistration()) {
            throw RuntimeException("You should fill all fields!")
        }
        userDao.findByUsernameOrEmail(request.login!!, request.email!!)
            ?.let { throw RuntimeException("User with this username or email exists") }

        val authorization = Authorization(
            email = request.email,
            login = request.login,
            password = PasswordEncoder.encode(request.password))


        val newUser = userDao.save(userConverter.toUserDto(authorization))
        val sessionId = sessionService.createSession(newUser.id!!)
        return AuthResponse(
            sessionId = sessionId,
            user = userConverter.fromDtoToUser(newUser)
        )
    }

    @Transactional
    override fun login(request: Authorization): AuthResponse {
        val userDto = userDao.findByUsernameOrEmail(request.login!!, request.email!!)
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