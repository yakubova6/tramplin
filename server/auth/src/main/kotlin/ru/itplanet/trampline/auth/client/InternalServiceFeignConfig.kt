package ru.itplanet.trampline.auth.client

import feign.RequestInterceptor
import org.springframework.context.annotation.Bean
import ru.itplanet.trampline.auth.config.InternalApiProperties

class InternalServiceFeignConfig {

    @Bean
    fun internalApiKeyRequestInterceptor(
        internalApiProperties: InternalApiProperties,
    ): RequestInterceptor {
        return RequestInterceptor { requestTemplate ->
            requestTemplate.header("X-Internal-Api-Key", internalApiProperties.apiKey)
        }
    }
}
