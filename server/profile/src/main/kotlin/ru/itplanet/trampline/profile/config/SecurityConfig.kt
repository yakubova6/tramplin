package ru.itplanet.trampline.profile.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.config.web.PathPatternRequestMatcherBuilderFactoryBean
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter
import org.springframework.security.web.authentication.logout.LogoutFilter
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher
import ru.itplanet.trampline.profile.security.ApiAccessDeniedHandler
import ru.itplanet.trampline.profile.security.ApiAuthenticationEntryPoint
import ru.itplanet.trampline.profile.security.InternalApiRequestFilter
import ru.itplanet.trampline.profile.security.SessionAuthenticationFilter

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(
    value = [
        AuthServiceProperties::class,
        InternalApiProperties::class
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
//            .csrf { csrf ->
//                csrf
//                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
//                    .ignoringRequestMatchers(
//                        request.matcher("/internal/**")
//                    )
//            }
            .csrf { it.disable() } // TODO: потом вернуть
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
                        request.matcher("/v3/api-docs/**"),
                        request.matcher("/swagger-ui.html"),
                        request.matcher("/swagger-ui/**"),
                        request.matcher("/error")
                    ).permitAll()
                    .requestMatchers(HttpMethod.PATCH, "/api/profile/employer").hasRole("EMPLOYER")
                    .requestMatchers(HttpMethod.PATCH, "/api/profile/applicant").hasRole("APPLICANT")
                    .requestMatchers(HttpMethod.GET, "/api/profile/**").permitAll()
                    .requestMatchers(request.matcher("/internal/**")).hasRole("INTERNAL")
                    .requestMatchers(request.matcher("/api/employer/**")).hasRole("EMPLOYER")
                    .anyRequest().authenticated()
            }
            .addFilterBefore(internalApiRequestFilter, LogoutFilter::class.java)
            .addFilterBefore(sessionAuthenticationFilter, AnonymousAuthenticationFilter::class.java)
            .build()
    }
}
