package ru.itplanet.trampline.auth.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.auth.converter.UserConverter
import ru.itplanet.trampline.auth.dao.UserDao
import ru.itplanet.trampline.auth.dao.dto.UserDto
import ru.itplanet.trampline.auth.exception.InvalidCredentialsException
import ru.itplanet.trampline.auth.exception.InvalidSessionException
import ru.itplanet.trampline.auth.exception.RegistrationRoleNotAllowedException
import ru.itplanet.trampline.auth.exception.UserAlreadyExistsException
import ru.itplanet.trampline.auth.model.Role
import ru.itplanet.trampline.auth.model.Status
import ru.itplanet.trampline.auth.model.TokenPayload
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.model.response.CurrentSessionResponse
import ru.itplanet.trampline.auth.model.response.SessionInfoResponse
import ru.itplanet.trampline.auth.util.EmailNormalizer
import java.time.Instant

@Service
class AuthServiceImpl(
    private val userDao: UserDao,
    private val userConverter: UserConverter,
    private val sessionService: SessionService,
    private val passwordEncoder: PasswordEncoder,
    private val emailNormalizer: EmailNormalizer,
    private val registrationProfileService: RegistrationProfileService,
) : AuthService {

    @Transactional
    override fun register(request: Registration): AuthResponse {
        if (request.role != Role.EMPLOYER && request.role != Role.APPLICANT) {
            throw RegistrationRoleNotAllowedException()
        }

        val normalizedEmail = emailNormalizer.normalize(request.email)

        if (userDao.findByEmail(normalizedEmail) != null) {
            throw UserAlreadyExistsException()
        }

        val status = if (request.role == Role.EMPLOYER) {
            Status.PENDING_VERIFICATION
        } else {
            Status.ACTIVE
        }

        val userToSave = userConverter.toUserDto(
            source = request,
            normalizedEmail = normalizedEmail,
            passwordHash = passwordEncoder.encode(request.password),
            status = status
        )

        val savedUser = try {
            userDao.saveAndFlush(userToSave)
        } catch (_: DataIntegrityViolationException) {
            throw UserAlreadyExistsException()
        }

        registrationProfileService.createInitialProfile(
            userId = savedUser.id!!,
            role = savedUser.role
        )

        val sessionId = sessionService.createSession(savedUser.id!!)

        return AuthResponse(
            sessionId = sessionId,
            user = userConverter.fromDtoToUser(savedUser)
        )
    }

    @Transactional
    override fun login(request: Authorization): AuthResponse {
        val normalizedEmail = emailNormalizer.normalize(request.email)

        val userDto = userDao.findByEmail(normalizedEmail)
            ?: throw InvalidCredentialsException()

        if (!passwordEncoder.matches(request.password, userDto.passwordHash)) {
            throw InvalidCredentialsException()
        }

        if (userDto.status == Status.BLOCKED || userDto.status == Status.DELETED) {
            throw InvalidCredentialsException()
        }

        userDto.lastLoginAt = Instant.now()
        val savedUser = userDao.save(userDto)

        return AuthResponse(
            sessionId = sessionService.createSession(savedUser.id!!),
            user = userConverter.fromDtoToUser(savedUser)
        )
    }

    override fun validateSession(sessionId: String?): TokenPayload {
        return validateActiveSession(sessionId).tokenPayload
    }

    override fun getCurrentSession(sessionId: String?): CurrentSessionResponse {
        val sessionContext = validateActiveSession(sessionId)

        return CurrentSessionResponse(
            user = userConverter.fromDtoToUser(sessionContext.user),
            session = SessionInfoResponse(
                created = sessionContext.tokenPayload.created,
                expires = sessionContext.tokenPayload.expires
            )
        )
    }

    override fun logout(sessionId: String?) {
        sessionService.deleteSession(sessionId)
    }

    private fun validateActiveSession(sessionId: String?): ValidatedSessionContext {
        val tokenPayload = sessionService.getSession(sessionId)

        val user = userDao.findById(tokenPayload.userId).orElse(null)
            ?: run {
                sessionService.deleteSession(sessionId)
                throw InvalidSessionException()
            }

        if (user.status == Status.BLOCKED || user.status == Status.DELETED) {
            sessionService.deleteSession(sessionId)
            throw InvalidSessionException()
        }

        val extendedPayload = sessionService.extendSession(sessionId)

        return ValidatedSessionContext(
            user = user,
            tokenPayload = extendedPayload
        )
    }

    private data class ValidatedSessionContext(
        val user: UserDto,
        val tokenPayload: TokenPayload
    )
}
