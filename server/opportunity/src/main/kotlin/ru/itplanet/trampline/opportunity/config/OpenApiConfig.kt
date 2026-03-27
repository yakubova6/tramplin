package ru.itplanet.trampline.opportunity.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {

    @Bean
    fun opportunityOpenApi(): OpenAPI {
        return OpenAPI()
            .info(
                Info()
                    .title("Tramplin Opportunity API")
                    .version("v1")
                    .description(
                        "Public API for opportunities, employer opportunity management and tags. " +
                                "Swagger UI includes only /api/** endpoints."
                    )
            )
            .components(
                Components().addSecuritySchemes(
                    SESSION_AUTH_SCHEME,
                    SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .`in`(SecurityScheme.In.COOKIE)
                        .name(SESSION_COOKIE_NAME)
                        .description("Session cookie issued by auth service after successful login.")
                )
            )
    }

    companion object {
        private const val SESSION_AUTH_SCHEME = "sessionAuth"
        private const val SESSION_COOKIE_NAME = "sessionId"
    }
}
