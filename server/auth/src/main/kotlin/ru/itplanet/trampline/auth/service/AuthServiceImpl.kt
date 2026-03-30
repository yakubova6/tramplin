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
import ru.itplanet.trampline.auth.exception.InvalidTwoFactorPendingTokenException
import ru.itplanet.trampline.auth.exception.RegistrationRoleNotAllowedException
import ru.itplanet.trampline.auth.exception.TwoFactorAlreadyDisabledException
import ru.itplanet.trampline.auth.exception.TwoFactorAlreadyEnabledException
import ru.itplanet.trampline.auth.exception.UserAlreadyExistsException
import ru.itplanet.trampline.auth.exception.UserNotFoundException
import ru.itplanet.trampline.auth.model.request.Authorization
import ru.itplanet.trampline.auth.model.request.PasswordResetConfirmRequest
import ru.itplanet.trampline.auth.model.request.PasswordResetRequest
import ru.itplanet.trampline.auth.model.request.PasswordResetVerifyRequest
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.auth.model.request.TwoFactorConfirmRequest
import ru.itplanet.trampline.auth.model.request.TwoFactorPasswordRequest
import ru.itplanet.trampline.auth.model.request.TwoFactorResendRequest
import ru.itplanet.trampline.auth.model.response.AuthResponse
import ru.itplanet.trampline.auth.model.response.CurrentSessionResponse
import ru.itplanet.trampline.auth.model.response.LoginResponse
import ru.itplanet.trampline.auth.model.response.PasswordResetVerifyResponse
import ru.itplanet.trampline.auth.model.response.SessionInfoResponse
import ru.itplanet.trampline.auth.model.response.TwoFactorChallengeResponse
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
    private val twoFactorChallengeService: TwoFactorChallengeService,
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
    override fun login(request: Authorization): LoginResponse {
        val normalizedEmail = emailNormalizer.normalize(request.email)

        val userDto = userDao.findByEmail(normalizedEmail)
            ?: throw InvalidCredentialsException()

        if (!passwordEncoder.matches(request.password, userDto.passwordHash)) {
            throw InvalidCredentialsException()
        }

        if (userDto.twoFactorEnabled) {
            val challenge = twoFactorChallengeService.createLoginChallenge(userDto)

            return LoginResponse(
                requiresTwoFactor = true,
                pendingToken = challenge.pendingToken,
                pendingTokenExpiresAt = challenge.expiresAt
            )
        }

        userDto.lastLoginAt = Instant.now()
        val savedUser = userDao.save(userDto)

        return LoginResponse(
            requiresTwoFactor = false,
            sessionId = sessionService.createSession(savedUser.id!!),
            user = userConverter.fromDtoToUser(savedUser)
        )
    }

    @Transactional
    override fun verifyLoginTwoFactor(request: TwoFactorConfirmRequest): AuthResponse {
        val userId = twoFactorChallengeService.verifyLoginChallenge(
            pendingToken = request.pendingToken,
            code = request.code
        )

        val user = userDao.findById(userId).orElse(null)
            ?: throw InvalidTwoFactorPendingTokenException()

        user.lastLoginAt = Instant.now()
        val savedUser = userDao.save(user)

        return AuthResponse(
            sessionId = sessionService.createSession(savedUser.id!!),
            user = userConverter.fromDtoToUser(savedUser)
        )
    }

    override fun resendLoginTwoFactorCode(request: TwoFactorResendRequest) {
        twoFactorChallengeService.resendLoginChallenge(request.pendingToken)
    }

    @Transactional
    override fun requestEnableTwoFactor(
        userId: Long,
        request: TwoFactorPasswordRequest
    ): TwoFactorChallengeResponse {
        val user = userDao.findByIdForUpdate(userId)
            ?: throw UserNotFoundException()

        if (user.twoFactorEnabled) {
            throw TwoFactorAlreadyEnabledException()
        }

        validateCurrentPassword(user, request.password)

        return twoFactorChallengeService.createEnableChallenge(user)
    }

    @Transactional
    override fun confirmEnableTwoFactor(
        userId: Long,
        request: TwoFactorConfirmRequest
    ) {
        val verifiedUserId = twoFactorChallengeService.verifyEnableChallenge(
            pendingToken = request.pendingToken,
            code = request.code,
            userId = userId
        )

        val user = userDao.findByIdForUpdate(verifiedUserId)
            ?: throw UserNotFoundException()

        if (user.twoFactorEnabled) {
            throw TwoFactorAlreadyEnabledException()
        }

        user.twoFactorEnabled = true
        userDao.saveAndFlush(user)
    }

    @Transactional
    override fun requestDisableTwoFactor(
        userId: Long,
        request: TwoFactorPasswordRequest
    ): TwoFactorChallengeResponse {
        val user = userDao.findByIdForUpdate(userId)
            ?: throw UserNotFoundException()

        if (!user.twoFactorEnabled) {
            throw TwoFactorAlreadyDisabledException()
        }

        validateCurrentPassword(user, request.password)

        return twoFactorChallengeService.createDisableChallenge(user)
    }

    @Transactional
    override fun confirmDisableTwoFactor(
        userId: Long,
        request: TwoFactorConfirmRequest
    ) {
        val verifiedUserId = twoFactorChallengeService.verifyDisableChallenge(
            pendingToken = request.pendingToken,
            code = request.code,
            userId = userId
        )

        val user = userDao.findByIdForUpdate(verifiedUserId)
            ?: throw UserNotFoundException()

        if (!user.twoFactorEnabled) {
            throw TwoFactorAlreadyDisabledException()
        }

        user.twoFactorEnabled = false
        userDao.saveAndFlush(user)
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

    private fun validateCurrentPassword(user: UserDto, password: String) {
        if (!passwordEncoder.matches(password, user.passwordHash)) {
            throw InvalidCredentialsException()
        }
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
