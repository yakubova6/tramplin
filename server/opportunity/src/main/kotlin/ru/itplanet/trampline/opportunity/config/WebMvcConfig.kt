package ru.itplanet.trampline.opportunity.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import ru.itplanet.trampline.opportunity.security.CurrentUserArgumentResolver

@Configuration
class WebMvcConfig(
    private val currentUserArgumentResolver: CurrentUserArgumentResolver
) : WebMvcConfigurer {

    override fun addArgumentResolvers(resolvers: MutableList<HandlerMethodArgumentResolver>) {
        resolvers.add(currentUserArgumentResolver)
    }
}
