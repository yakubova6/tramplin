package ru.itplanet.trampline.moderation.security

import org.springframework.core.MethodParameter
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.bind.support.WebDataBinderFactory
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.method.support.ModelAndViewContainer
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.moderation.exception.ModerationForbiddenException

@Component
class CurrentUserArgumentResolver : HandlerMethodArgumentResolver {

    override fun supportsParameter(parameter: MethodParameter): Boolean {
        if (!parameter.hasParameterAnnotation(CurrentUser::class.java)) {
            return false
        }

        val parameterType = parameter.parameterType
        return parameterType == AuthenticatedUser::class.java ||
                parameterType == java.lang.Long::class.java ||
                parameterType == Long::class.javaPrimitiveType
    }

    override fun resolveArgument(
        parameter: MethodParameter,
        mavContainer: ModelAndViewContainer?,
        webRequest: NativeWebRequest,
        binderFactory: WebDataBinderFactory?,
    ): Any {
        val principal = SecurityContextHolder.getContext().authentication?.principal as? AuthenticatedUser
            ?: throw ModerationForbiddenException(
                message = "Требуется авторизация",
                code = "unauthorized",
            )

        return when (parameter.parameterType) {
            AuthenticatedUser::class.java -> principal
            java.lang.Long::class.java,
            Long::class.javaPrimitiveType -> principal.userId
            else -> throw IllegalStateException(
                "Неподдерживаемый тип параметра для @CurrentUser: ${parameter.parameterType.name}",
            )
        }
    }
}
