package ru.itplanet.trampline.auth.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.config.web.PathPatternRequestMatcherBuilderFactoryBean
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.logout.LogoutFilter
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher
import ru.itplanet.trampline.auth.security.InternalApiRequestFilter
import ru.itplanet.trampline.auth.security.SessionAuthenticationFilter

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(
    value = [
        SessionProperties::class,
        InternalApiProperties::class
    ]
)
class SecurityConfig(
    private val sessionAuthenticationFilter: SessionAuthenticationFilter,
    private val internalApiRequestFilter: InternalApiRequestFilter
) {

    @Bean
    fun requestMatcherBuilder(): PathPatternRequestMatcherBuilderFactoryBean {
        return PathPatternRequestMatcherBuilderFactoryBean()
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        val request = PathPatternRequestMatcher.withDefaults()

        return http
            .csrf { csrf ->
                csrf
                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .ignoringRequestMatchers(
                        request.matcher("/api/auth/register"),
                        request.matcher("/api/auth/login"),
                        request.matcher("/api/auth/validateSession"),
                        request.matcher("/internal/**")
                    )
            }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .logout { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling {
                it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(
                        request.matcher("/api/auth/register"),
                        request.matcher("/api/auth/login"),
                        request.matcher("/api/auth/validateSession"),
                        request.matcher("/internal/**"),
                        request.matcher("/error")
                    )
                    .permitAll()
                    .anyRequest()
                    .authenticated()
            }
            .addFilterBefore(internalApiRequestFilter, LogoutFilter::class.java)
            .addFilterBefore(sessionAuthenticationFilter, AnonymousAuthenticationFilter::class.java)
            .build()
    }
}
