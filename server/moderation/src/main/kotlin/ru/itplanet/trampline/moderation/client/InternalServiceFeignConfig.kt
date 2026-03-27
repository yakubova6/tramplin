package ru.itplanet.trampline.moderation.client

import feign.RequestInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import ru.itplanet.trampline.moderation.config.InternalApiProperties

@Configuration
class InternalServiceFeignConfig(
    private val internalApiProperties: InternalApiProperties,
) {

    @Bean
    fun internalApiKeyRequestInterceptor(): RequestInterceptor {
        return RequestInterceptor { requestTemplate ->
            requestTemplate.header("X-Internal-Api-Key", internalApiProperties.apiKey)
        }
    }
}
