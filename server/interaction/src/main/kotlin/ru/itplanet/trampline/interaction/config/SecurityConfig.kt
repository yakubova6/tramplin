package ru.itplanet.trampline.interaction.config

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
import ru.itplanet.trampline.interaction.security.ApiAccessDeniedHandler
import ru.itplanet.trampline.interaction.security.ApiAuthenticationEntryPoint
import ru.itplanet.trampline.interaction.security.InternalApiRequestFilter
import ru.itplanet.trampline.interaction.security.SessionAuthenticationFilter
import ru.itplanet.trampline.interaction.config.AuthServiceProperties
import ru.itplanet.trampline.interaction.config.InternalApiProperties

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
                    .requestMatchers(HttpMethod.PATCH, "/api/interaction/responses/**").hasRole("EMPLOYER")
                    .requestMatchers(HttpMethod.PATCH, "/api/interaction/contacts/**").hasRole("APPLICANT")
                    .requestMatchers(HttpMethod.GET, "/api/interaction/opportunities/**").hasRole("EMPLOYER")
                    .requestMatchers(HttpMethod.POST, "/api/interaction/**").hasRole("APPLICANT")
                    .requestMatchers(HttpMethod.DELETE, "/api/interaction/**").hasRole("APPLICANT")
                    .requestMatchers(HttpMethod.GET, "/api/interaction/**").permitAll()
                    .requestMatchers(request.matcher("/internal/**")).hasRole("INTERNAL")
                    .requestMatchers(request.matcher("/error")).permitAll()
                    .anyRequest().authenticated()
            }
            .addFilterBefore(internalApiRequestFilter, LogoutFilter::class.java)
            .addFilterBefore(sessionAuthenticationFilter, AnonymousAuthenticationFilter::class.java)
            .build()
    }
}
