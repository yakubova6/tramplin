package ru.itplanet.trampline.commons.model

import java.time.Instant

data class TokenPayload(
    val userId: Long,
    val created: Instant,
    val expires: Instant
) {
    fun isExpired(now: Instant = Instant.now()): Boolean {
        return expires.isBefore(now)
    }

    companion object {
        fun new(
            userId: Long,
            ttlSeconds: Long,
            now: Instant = Instant.now()
        ): TokenPayload {
            return TokenPayload(
                userId = userId,
                created = now,
                expires = now.plusSeconds(ttlSeconds)
            )
        }
    }
}
