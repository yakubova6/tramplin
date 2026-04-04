package ru.itplanet.trampline.moderation.config

import jakarta.validation.constraints.NotBlank
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties(prefix = "auth.service")
data class AuthServiceProperties(
    @field:NotBlank(message = "URL сервиса авторизации обязателен")
    var url: String = "",
)
