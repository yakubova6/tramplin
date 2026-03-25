package ru.itplanet.trampline.profile.client

import feign.RequestInterceptor
import jakarta.servlet.http.HttpServletRequest
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.web.context.request.RequestContextHolder
import org.springframework.web.context.request.ServletRequestAttributes

@Configuration
class AuthServiceFeignConfig {

    @Bean
    fun cookieRelayRequestInterceptor(): RequestInterceptor {
        return RequestInterceptor { requestTemplate ->
            val attributes = RequestContextHolder.getRequestAttributes() as? ServletRequestAttributes
                ?: return@RequestInterceptor

            val request: HttpServletRequest = attributes.request
            val cookieHeader = request.getHeader(HttpHeaders.COOKIE)

            if (!cookieHeader.isNullOrBlank()) {
                requestTemplate.header(HttpHeaders.COOKIE, cookieHeader)
            }
        }
    }
}