package ru.itplanet.trampline.auth.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter
import org.springframework.security.web.authentication.logout.LogoutFilter
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher
import org.springframework.security.config.web.PathPatternRequestMatcherBuilderFactoryBean
import ru.itplanet.trampline.auth.security.ApiAccessDeniedHandler
import ru.itplanet.trampline.auth.security.ApiAuthenticationEntryPoint
import ru.itplanet.trampline.auth.security.InternalApiRequestFilter
import ru.itplanet.trampline.auth.security.SessionAuthenticationFilter

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(
    value = [
        SessionProperties::class,
        InternalApiProperties::class,
        PasswordResetProperties::class
    ]
)
class SecurityConfig(
    private val sessionAuthenticationFilter: SessionAuthenticationFilter,
    private val internalApiRequestFilter: InternalApiRequestFilter,
    private val apiAuthenticationEntryPoint: ApiAuthenticationEntryPoint,
    private val apiAccessDeniedHandler: ApiAccessDeniedHandler
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
                        request.matcher("/api/auth/password-reset/request"),
                        request.matcher("/api/auth/password-reset/verify"),
                        request.matcher("/api/auth/password-reset/confirm"),
                        request.matcher("/internal/**")
                    )
            }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .logout { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling {
                it.authenticationEntryPoint(apiAuthenticationEntryPoint)
                it.accessDeniedHandler(apiAccessDeniedHandler)
            }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(
                        request.matcher("/api/auth/register"),
                        request.matcher("/api/auth/login"),
                        request.matcher("/api/auth/validateSession"),
                        request.matcher("/api/auth/password-reset/request"),
                        request.matcher("/api/auth/password-reset/verify"),
                        request.matcher("/api/auth/password-reset/confirm"),
                        request.matcher("/v3/api-docs/**"),
                        request.matcher("/swagger-ui.html"),
                        request.matcher("/swagger-ui/**"),
                        request.matcher("/error")
                    )
                    .permitAll()
                    .requestMatchers(request.matcher("/internal/**"))
                    .hasRole("INTERNAL")
                    .anyRequest()
                    .authenticated()
            }
            .addFilterBefore(internalApiRequestFilter, LogoutFilter::class.java)
            .addFilterBefore(sessionAuthenticationFilter, AnonymousAuthenticationFilter::class.java)
            .build()
    }
}
