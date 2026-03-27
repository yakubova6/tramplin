package ru.itplanet.trampline.auth.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig(
    private val sessionProperties: SessionProperties,
) {

    @Bean
    fun authOpenApi(): OpenAPI {
        return OpenAPI()
            .info(
                Info()
                    .title("Tramplin Auth API")
                    .version("v1")
                    .description(
                        "Public authentication API for registration, login, session management and curator administration. " +
                                "Swagger UI includes only /api/** endpoints."
                    )
            )
            .components(
                Components().addSecuritySchemes(
                    SESSION_AUTH_SCHEME,
                    SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .`in`(SecurityScheme.In.COOKIE)
                        .name(sessionProperties.cookieName)
                        .description("Session cookie issued by auth service after successful login.")
                )
            )
    }

    companion object {
        private const val SESSION_AUTH_SCHEME = "sessionAuth"
    }
}
