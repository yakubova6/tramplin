package ru.itplanet.trampline.auth.service

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import ru.itplanet.trampline.auth.model.TokenPayload
import java.security.SecureRandom
import java.time.Instant
import java.util.*
import java.util.concurrent.TimeUnit

@Service
class SessionService(
    private val redisTemplate: RedisTemplate<String, String>
) {
    private val objectMapper = ObjectMapper()
        .registerModule(JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private val secureRandom = SecureRandom()
    private val base64Encoder: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()

    fun createSession(userId: UUID): String {
        val sessionId = generateId()
        val tokenPayload: TokenPayload = TokenPayload(userId)
        redisTemplate.opsForValue()[sessionId, writeAsString(tokenPayload), 3600] = TimeUnit.SECONDS
        return sessionId
    }

    fun getSession(sessionId: String?): TokenPayload {
        return readAsTokenPayload(
            redisTemplate.opsForValue()[sessionId
                ?: throw RuntimeException("Session id does not exists")]
        )
    }

    fun extendSession(sessionId: String?): TokenPayload {
        val tokenPayload: TokenPayload = getSession(sessionId)
        tokenPayload.expires = Instant.now().plusSeconds(3600)
        deleteSession(sessionId)
        redisTemplate.opsForValue()[sessionId
            ?: throw RuntimeException("Session id does not exists"), writeAsString(tokenPayload)] = 3600
        return tokenPayload
    }

    fun deleteSession(sessionId: String?) {
        redisTemplate.opsForValue().getAndDelete(sessionId!!)
    }

    private fun generateId(): String {
        val randomBytes = ByteArray(32) // 32 байта = 256 бит
        secureRandom.nextBytes(randomBytes)
        return base64Encoder.encodeToString(randomBytes)
    }

    private fun writeAsString(tokenPayload: TokenPayload): String {
        try {
            return objectMapper.writeValueAsString(tokenPayload)
        } catch (e: JsonProcessingException) {
            throw RuntimeException()
        }
    }

    private fun readAsTokenPayload(rawJson: String?): TokenPayload {
        try {
            return objectMapper.readValue(rawJson!!.replace("\u0000", ""), TokenPayload::class.java)
        } catch (e: JsonProcessingException) {
            throw RuntimeException()
        }
    }
}