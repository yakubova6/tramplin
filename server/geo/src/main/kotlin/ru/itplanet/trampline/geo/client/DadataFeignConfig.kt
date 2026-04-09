package ru.itplanet.trampline.geo.client

import feign.RequestInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import ru.itplanet.trampline.geo.config.DadataProperties

@Configuration
class DadataFeignConfig(
    private val dadataProperties: DadataProperties,
) {

    @Bean
    fun dadataRequestInterceptor(): RequestInterceptor {
        return RequestInterceptor { template ->
            template.header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
            template.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            if (dadataProperties.apiKey.isNotBlank()) {
                template.header(HttpHeaders.AUTHORIZATION, "Token ${dadataProperties.apiKey}")
            }
        }
    }
}
