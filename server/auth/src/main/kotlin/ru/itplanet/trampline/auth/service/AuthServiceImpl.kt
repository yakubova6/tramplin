package ru.itplanet.trampline.auth.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.auth.config.PasswordResetProperties
import ru.itplanet.trampline.auth.converter.UserConverter
import ru.itplanet.trampline.auth.exception.InvalidCredentialsException
import ru.itplanet.trampline.auth.exception.InvalidPasswordResetCodeException
import ru.itplanet.trampline.auth.exception.InvalidPasswordResetTokenException
import ru.itplanet.trampline.auth.exception.InvalidSessionException
import ru.itplanet.trampline.auth.exception.RegistrationRoleNotAllowedException
import ru.itplanet.trampline.auth.exception.UserAlreadyExistsException
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.request.PasswordResetConfirmRequest
import ru.itplanet.trampline.auth.model.request.PasswordResetRequest
import ru.itplanet.trampline.auth.model.request.PasswordResetVerifyRequest
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.model.response.CurrentSessionResponse
import ru.itplanet.trampline.auth.model.response.PasswordResetVerifyResponse
import ru.itplanet.trampline.auth.model.response.SessionInfoResponse
import ru.itplanet.trampline.auth.util.EmailNormalizer
import ru.itplanet.trampline.auth.util.PasswordResetCodeGenerator
import ru.itplanet.trampline.commons.dao.UserDao
import ru.itplanet.trampline.commons.dao.dto.UserDto
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.TokenPayload
import java.time.Instant
import java.util.UUID

@Service
class AuthServiceImpl(
    private val userDao: UserDao,
    private val userConverter: UserConverter,
    private val sessionService: SessionService,
    private val passwordEncoder: PasswordEncoder,
    private val emailNormalizer: EmailNormalizer,
    private val registrationProfileService: RegistrationProfileService,
    private val passwordResetCodeGenerator: PasswordResetCodeGenerator,
    private val passwordResetMailService: PasswordResetMailService,
    private val passwordResetProperties: PasswordResetProperties,
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

        val userToSave = userConverter.toUserDto(
            source = request,
            normalizedEmail = normalizedEmail,
            passwordHash = passwordEncoder.encode(request.password),
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

        userDto.lastLoginAt = Instant.now()
        val savedUser = userDao.save(userDto)

        return AuthResponse(
            sessionId = sessionService.createSession(savedUser.id!!),
            user = userConverter.fromDtoToUser(savedUser)
        )
    }

    @Transactional
    override fun requestPasswordReset(request: PasswordResetRequest) {
        val normalizedEmail = emailNormalizer.normalize(request.email)
        val user = userDao.findByEmailForUpdate(normalizedEmail) ?: return

        val now = Instant.now()
        val sentAt = user.passwordResetCodeSentAt

        if (sentAt != null && sentAt.plusSeconds(passwordResetProperties.resendCooldownSeconds).isAfter(now)) {
            return
        }

        val code = passwordResetCodeGenerator.generate()

        user.passwordResetCodeHash = passwordEncoder.encode(code)
        user.passwordResetCodeExpiresAt = now.plusSeconds(passwordResetProperties.codeTtlMinutes * 60)
        user.passwordResetCodeSentAt = now
        user.passwordResetCodeAttempts = 0
        user.passwordResetTokenHash = null
        user.passwordResetTokenExpiresAt = null

        userDao.saveAndFlush(user)
        passwordResetMailService.sendPasswordResetCode(user.email, code)
    }

    @Transactional
    override fun verifyPasswordResetCode(request: PasswordResetVerifyRequest): PasswordResetVerifyResponse {
        val normalizedEmail = emailNormalizer.normalize(request.email)
        val user = userDao.findByEmailForUpdate(normalizedEmail)
            ?: throw InvalidPasswordResetCodeException()

        val now = Instant.now()
        val codeHash = user.passwordResetCodeHash
        val codeExpiresAt = user.passwordResetCodeExpiresAt

        if (codeHash == null || codeExpiresAt == null || codeExpiresAt.isBefore(now)) {
            clearPasswordResetState(user)
            userDao.saveAndFlush(user)
            throw InvalidPasswordResetCodeException()
        }

        if (user.passwordResetCodeAttempts >= passwordResetProperties.maxVerifyAttempts) {
            clearPasswordResetState(user)
            userDao.saveAndFlush(user)
            throw InvalidPasswordResetCodeException()
        }

        if (!passwordEncoder.matches(request.code, codeHash)) {
            user.passwordResetCodeAttempts += 1

            if (user.passwordResetCodeAttempts >= passwordResetProperties.maxVerifyAttempts) {
                clearPasswordResetState(user)
            }

            userDao.saveAndFlush(user)
            throw InvalidPasswordResetCodeException()
        }

        val resetToken = UUID.randomUUID().toString()
        val resetTokenExpiresAt = now.plusSeconds(passwordResetProperties.resetTokenTtlMinutes * 60)

        user.passwordResetTokenHash = passwordEncoder.encode(resetToken)
        user.passwordResetTokenExpiresAt = resetTokenExpiresAt
        user.passwordResetCodeHash = null
        user.passwordResetCodeExpiresAt = null
        user.passwordResetCodeSentAt = null
        user.passwordResetCodeAttempts = 0

        userDao.saveAndFlush(user)

        return PasswordResetVerifyResponse(
            resetToken = resetToken,
            expiresAt = resetTokenExpiresAt
        )
    }

    @Transactional
    override fun confirmPasswordReset(request: PasswordResetConfirmRequest) {
        val normalizedEmail = emailNormalizer.normalize(request.email)
        val user = userDao.findByEmailForUpdate(normalizedEmail)
            ?: throw InvalidPasswordResetTokenException()

        val now = Instant.now()
        val tokenHash = user.passwordResetTokenHash
        val tokenExpiresAt = user.passwordResetTokenExpiresAt

        if (tokenHash == null || tokenExpiresAt == null || tokenExpiresAt.isBefore(now)) {
            clearPasswordResetState(user)
            userDao.saveAndFlush(user)
            throw InvalidPasswordResetTokenException()
        }

        if (!passwordEncoder.matches(request.resetToken, tokenHash)) {
            throw InvalidPasswordResetTokenException()
        }

        user.passwordHash = passwordEncoder.encode(request.newPassword)
        clearPasswordResetState(user)

        val savedUser = userDao.saveAndFlush(user)
        sessionService.deleteAllSessionsByUserId(savedUser.id!!)
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

        val extendedPayload = sessionService.extendSession(sessionId)

        return ValidatedSessionContext(
            user = user,
            tokenPayload = extendedPayload
        )
    }

    private fun clearPasswordResetState(user: UserDto) {
        user.passwordResetCodeHash = null
        user.passwordResetCodeExpiresAt = null
        user.passwordResetCodeSentAt = null
        user.passwordResetCodeAttempts = 0
        user.passwordResetTokenHash = null
        user.passwordResetTokenExpiresAt = null
    }

    private data class ValidatedSessionContext(
        val user: UserDto,
        val tokenPayload: TokenPayload
    )
}
