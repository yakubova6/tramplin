package ru.itplanet.trampline.geo.config

import jakarta.validation.constraints.NotBlank
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties(prefix = "auth.service")
data class AuthServiceProperties(
    @field:NotBlank(message = "Auth service url must not be blank")
    var url: String = ""
)
