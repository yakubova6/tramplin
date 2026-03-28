package ru.itplanet.trampline.opportunity.client

import feign.RequestInterceptor
import org.springframework.context.annotation.Bean
import ru.itplanet.trampline.opportunity.config.InternalApiProperties

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
