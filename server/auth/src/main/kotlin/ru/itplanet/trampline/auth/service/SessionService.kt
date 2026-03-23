package ru.itplanet.trampline.auth.service

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import ru.itplanet.trampline.auth.config.SessionProperties
import ru.itplanet.trampline.auth.exception.InvalidSessionException
import ru.itplanet.trampline.auth.model.TokenPayload
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant
import java.util.Base64

@Service
class SessionService(
    private val stringRedisTemplate: StringRedisTemplate,
    private val objectMapper: ObjectMapper,
    private val sessionProperties: SessionProperties
) {
    private val secureRandom = SecureRandom()
    private val base64Encoder: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()

    fun createSession(userId: Long): String {
        val sessionId = generateId()
        val tokenPayload = TokenPayload.new(
            userId = userId,
            ttlSeconds = sessionProperties.ttlSeconds
        )

        stringRedisTemplate.opsForValue().set(
            buildKey(sessionId),
            writeAsString(tokenPayload),
            Duration.ofSeconds(sessionProperties.ttlSeconds)
        )

        return sessionId
    }

    fun getSession(sessionId: String?): TokenPayload {
        return getSessionOrNull(sessionId) ?: throw InvalidSessionException()
    }

    fun getSessionOrNull(sessionId: String?): TokenPayload? {
        val id = sessionId?.takeIf { it.isNotBlank() } ?: return null

        val rawJson = stringRedisTemplate.opsForValue().get(buildKey(id)) ?: return null
        val tokenPayload = readAsTokenPayloadOrNull(rawJson) ?: run {
            deleteSession(id)
            return null
        }

        if (tokenPayload.isExpired()) {
            deleteSession(id)
            return null
        }

        return tokenPayload
    }

    fun extendSession(sessionId: String?): TokenPayload {
        val id = sessionId?.takeIf { it.isNotBlank() } ?: throw InvalidSessionException()
        val currentPayload = getSession(id)

        val updatedPayload = currentPayload.copy(
            expires = Instant.now().plusSeconds(sessionProperties.ttlSeconds)
        )

        stringRedisTemplate.opsForValue().set(
            buildKey(id),
            writeAsString(updatedPayload),
            Duration.ofSeconds(sessionProperties.ttlSeconds)
        )

        return updatedPayload
    }

    fun deleteSession(sessionId: String?) {
        val id = sessionId?.takeIf { it.isNotBlank() } ?: return
        stringRedisTemplate.delete(buildKey(id))
    }

    private fun generateId(): String {
        val randomBytes = ByteArray(32)
        secureRandom.nextBytes(randomBytes)
        return base64Encoder.encodeToString(randomBytes)
    }

    private fun buildKey(sessionId: String): String {
        return "session:$sessionId"
    }

    private fun writeAsString(tokenPayload: TokenPayload): String {
        try {
            return objectMapper.writeValueAsString(tokenPayload)
        } catch (_: JsonProcessingException) {
            throw InvalidSessionException()
        }
    }

    private fun readAsTokenPayloadOrNull(rawJson: String): TokenPayload? {
        return try {
            objectMapper.readValue(rawJson, TokenPayload::class.java)
        } catch (_: JsonProcessingException) {
            null
        }
    }
}
