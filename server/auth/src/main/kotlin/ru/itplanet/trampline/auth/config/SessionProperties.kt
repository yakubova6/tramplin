package ru.itplanet.trampline.auth.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "auth.session")
data class SessionProperties(
    var cookieName: String = "sessionId",
    var ttlSeconds: Long = 3600,
    var secureCookie: Boolean = false,
    var sameSite: String = "Lax"
)
