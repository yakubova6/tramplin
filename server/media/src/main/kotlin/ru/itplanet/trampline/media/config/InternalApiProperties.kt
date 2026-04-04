package ru.itplanet.trampline.media.config

import jakarta.validation.constraints.NotBlank
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties(prefix = "internal-api")
data class InternalApiProperties(
    @field:NotBlank(message = "Внутренний API-ключ обязателен")
    var apiKey: String = "",
)
