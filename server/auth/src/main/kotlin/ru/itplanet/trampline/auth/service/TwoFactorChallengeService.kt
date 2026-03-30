package ru.itplanet.trampline.auth.service

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import ru.itplanet.trampline.auth.config.TwoFactorProperties
import ru.itplanet.trampline.auth.exception.InvalidTwoFactorCodeException
import ru.itplanet.trampline.auth.exception.InvalidTwoFactorPendingTokenException
import ru.itplanet.trampline.auth.model.response.TwoFactorChallengeResponse
import ru.itplanet.trampline.auth.util.PasswordResetCodeGenerator
import ru.itplanet.trampline.commons.dao.dto.UserDto
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Service
class TwoFactorChallengeService(
    private val stringRedisTemplate: StringRedisTemplate,
    private val objectMapper: ObjectMapper,
    private val passwordEncoder: PasswordEncoder,
    private val twoFactorProperties: TwoFactorProperties,
    private val twoFactorMailService: TwoFactorMailService,
    private val codeGenerator: PasswordResetCodeGenerator
) {

    fun createLoginChallenge(user: UserDto): TwoFactorChallengeResponse {
        return createChallenge(user, ChallengePurpose.LOGIN)
    }

    fun createEnableChallenge(user: UserDto): TwoFactorChallengeResponse {
        return createChallenge(user, ChallengePurpose.ENABLE)
    }

    fun createDisableChallenge(user: UserDto): TwoFactorChallengeResponse {
        return createChallenge(user, ChallengePurpose.DISABLE)
    }

    fun resendLoginChallenge(pendingToken: String) {
        val challenge = getChallenge(
            pendingToken = pendingToken,
            expectedPurpose = ChallengePurpose.LOGIN
        )

        if (challenge.sentAt.plusSeconds(twoFactorProperties.resendCooldownSeconds).isAfter(Instant.now())) {
            return
        }

        resendChallenge(challenge)
    }

    fun verifyLoginChallenge(
        pendingToken: String,
        code: String
    ): Long {
        return verifyChallenge(
            pendingToken = pendingToken,
            code = code,
            expectedPurpose = ChallengePurpose.LOGIN
        )
    }

    fun verifyEnableChallenge(
        pendingToken: String,
        code: String,
        userId: Long
    ): Long {
        return verifyChallenge(
            pendingToken = pendingToken,
            code = code,
            expectedPurpose = ChallengePurpose.ENABLE,
            expectedUserId = userId
        )
    }

    fun verifyDisableChallenge(
        pendingToken: String,
        code: String,
        userId: Long
    ): Long {
        return verifyChallenge(
            pendingToken = pendingToken,
            code = code,
            expectedPurpose = ChallengePurpose.DISABLE,
            expectedUserId = userId
        )
    }

    private fun createChallenge(
        user: UserDto,
        purpose: ChallengePurpose
    ): TwoFactorChallengeResponse {
        val userId = user.id ?: throw InvalidTwoFactorPendingTokenException()
        val existingChallenge = findActiveChallenge(userId, purpose)
        val now = Instant.now()

        if (existingChallenge != null) {
            if (existingChallenge.sentAt.plusSeconds(twoFactorProperties.resendCooldownSeconds).isAfter(now)) {
                return existingChallenge.toResponse()
            }

            return resendChallenge(existingChallenge)
        }

        val code = codeGenerator.generate()
        val challenge = StoredTwoFactorChallenge(
            pendingToken = UUID.randomUUID().toString(),
            userId = userId,
            email = user.email,
            purpose = purpose,
            codeHash = passwordEncoder.encode(code),
            expiresAt = now.plusSeconds(twoFactorProperties.codeTtlMinutes * 60),
            sentAt = now,
            attempts = 0
        )

        saveChallenge(challenge)
        sendCode(challenge.email, code, purpose)

        return challenge.toResponse()
    }

    private fun resendChallenge(challenge: StoredTwoFactorChallenge): TwoFactorChallengeResponse {
        val now = Instant.now()
        val code = codeGenerator.generate()

        val updatedChallenge = challenge.copy(
            codeHash = passwordEncoder.encode(code),
            expiresAt = now.plusSeconds(twoFactorProperties.codeTtlMinutes * 60),
            sentAt = now,
            attempts = 0
        )

        saveChallenge(updatedChallenge)
        sendCode(updatedChallenge.email, code, updatedChallenge.purpose)

        return updatedChallenge.toResponse()
    }

    private fun verifyChallenge(
        pendingToken: String,
        code: String,
        expectedPurpose: ChallengePurpose,
        expectedUserId: Long? = null
    ): Long {
        val challenge = getChallenge(
            pendingToken = pendingToken,
            expectedPurpose = expectedPurpose,
            expectedUserId = expectedUserId
        )

        if (challenge.attempts >= twoFactorProperties.maxVerifyAttempts) {
            deleteChallenge(challenge)
            throw InvalidTwoFactorCodeException()
        }

        if (!passwordEncoder.matches(code, challenge.codeHash)) {
            val updatedChallenge = challenge.copy(
                attempts = challenge.attempts + 1
            )

            if (updatedChallenge.attempts >= twoFactorProperties.maxVerifyAttempts) {
                deleteChallenge(updatedChallenge)
            } else {
                saveChallenge(updatedChallenge)
            }

            throw InvalidTwoFactorCodeException()
        }

        deleteChallenge(challenge)

        return challenge.userId
    }

    private fun getChallenge(
        pendingToken: String,
        expectedPurpose: ChallengePurpose,
        expectedUserId: Long? = null
    ): StoredTwoFactorChallenge {
        val challenge = getChallengeOrNull(pendingToken)
            ?: throw InvalidTwoFactorPendingTokenException()

        if (challenge.purpose != expectedPurpose) {
            deleteChallenge(challenge)
            throw InvalidTwoFactorPendingTokenException()
        }

        if (expectedUserId != null && challenge.userId != expectedUserId) {
            deleteChallenge(challenge)
            throw InvalidTwoFactorPendingTokenException()
        }

        if (challenge.expiresAt.isBefore(Instant.now())) {
            deleteChallenge(challenge)
            throw InvalidTwoFactorPendingTokenException()
        }

        return challenge
    }

    private fun findActiveChallenge(
        userId: Long,
        purpose: ChallengePurpose
    ): StoredTwoFactorChallenge? {
        val pendingToken = stringRedisTemplate.opsForValue()
            .get(buildIndexKey(userId, purpose))
            ?.takeIf { it.isNotBlank() }
            ?: return null

        val challenge = getChallengeOrNull(pendingToken)

        if (challenge == null) {
            stringRedisTemplate.delete(buildIndexKey(userId, purpose))
            return null
        }

        if (challenge.userId != userId || challenge.purpose != purpose) {
            deleteChallenge(challenge)
            return null
        }

        if (challenge.expiresAt.isBefore(Instant.now())) {
            deleteChallenge(challenge)
            return null
        }

        return challenge
    }

    private fun getChallengeOrNull(pendingToken: String): StoredTwoFactorChallenge? {
        val token = pendingToken.takeIf { it.isNotBlank() } ?: return null
        val rawJson = stringRedisTemplate.opsForValue().get(buildChallengeKey(token)) ?: return null

        return readAsChallengeOrNull(rawJson)
    }

    private fun saveChallenge(challenge: StoredTwoFactorChallenge) {
        val ttl = Duration.between(Instant.now(), challenge.expiresAt)
            .takeIf { !it.isNegative && !it.isZero }
            ?: Duration.ofSeconds(1)

        stringRedisTemplate.opsForValue().set(
            buildChallengeKey(challenge.pendingToken),
            writeAsString(challenge),
            ttl
        )

        stringRedisTemplate.opsForValue().set(
            buildIndexKey(challenge.userId, challenge.purpose),
            challenge.pendingToken,
            ttl
        )
    }

    private fun deleteChallenge(challenge: StoredTwoFactorChallenge) {
        stringRedisTemplate.delete(
            listOf(
                buildChallengeKey(challenge.pendingToken),
                buildIndexKey(challenge.userId, challenge.purpose)
            )
        )
    }

    private fun sendCode(
        email: String,
        code: String,
        purpose: ChallengePurpose
    ) {
        when (purpose) {
            ChallengePurpose.LOGIN -> twoFactorMailService.sendLoginCode(email, code)
            ChallengePurpose.ENABLE -> twoFactorMailService.sendEnableCode(email, code)
            ChallengePurpose.DISABLE -> twoFactorMailService.sendDisableCode(email, code)
        }
    }

    private fun buildChallengeKey(pendingToken: String): String {
        return "two-factor:challenge:$pendingToken"
    }

    private fun buildIndexKey(
        userId: Long,
        purpose: ChallengePurpose
    ): String {
        return "two-factor:challenge:index:${purpose.name.lowercase()}:$userId"
    }

    private fun writeAsString(challenge: StoredTwoFactorChallenge): String {
        try {
            return objectMapper.writeValueAsString(challenge)
        } catch (_: JsonProcessingException) {
            throw IllegalStateException("Unable to store two-factor challenge")
        }
    }

    private fun readAsChallengeOrNull(rawJson: String): StoredTwoFactorChallenge? {
        return try {
            objectMapper.readValue(rawJson, StoredTwoFactorChallenge::class.java)
        } catch (_: JsonProcessingException) {
            null
        }
    }

    private data class StoredTwoFactorChallenge(
        val pendingToken: String,
        val userId: Long,
        val email: String,
        val purpose: ChallengePurpose,
        val codeHash: String,
        val expiresAt: Instant,
        val sentAt: Instant,
        val attempts: Int
    ) {
        fun toResponse(): TwoFactorChallengeResponse {
            return TwoFactorChallengeResponse(
                pendingToken = pendingToken,
                expiresAt = expiresAt
            )
        }
    }

    private enum class ChallengePurpose {
        LOGIN,
        ENABLE,
        DISABLE
    }
}
