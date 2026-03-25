package ru.itplanet.trampline.profile.config

import jakarta.validation.constraints.NotBlank
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties(prefix = "internal-api")
data class InternalApiProperties(
    @field:NotBlank(message = "Internal API key must not be blank")
    var apiKey: String = ""
)
