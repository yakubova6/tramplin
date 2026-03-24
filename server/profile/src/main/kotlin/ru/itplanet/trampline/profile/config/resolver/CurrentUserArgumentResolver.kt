package ru.itplanet.trampline.profile.config.resolver

import jakarta.servlet.http.HttpServletRequest
import org.springframework.beans.factory.ObjectProvider
import org.springframework.core.MethodParameter
import org.springframework.stereotype.Component
import org.springframework.web.bind.support.WebDataBinderFactory
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.method.support.ModelAndViewContainer
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.profile.connector.AuthConnector

@Component
class CurrentUserArgumentResolver(
    private val authConnectorProvider: ObjectProvider<AuthConnector>
) : HandlerMethodArgumentResolver {

    override fun supportsParameter(parameter: MethodParameter): Boolean {
        return parameter.hasParameterAnnotation(CurrentUser::class.java) &&
            parameter.parameterType == Long::class.java
    }

    override fun resolveArgument(
        parameter: MethodParameter,
        mavContainer: ModelAndViewContainer?,
        webRequest: NativeWebRequest,
        binderFactory: WebDataBinderFactory?
    ): Any? {
        val request = webRequest.getNativeRequest(HttpServletRequest::class.java)
            ?: throw IllegalStateException("No HTTP request found")

        val sessionId = extractSessionId(request)
            ?: throw RuntimeException("Session cookie not found")

        val authConnector = authConnectorProvider.getObject()

        val payload = authConnector.validateSession(sessionId)

        return payload.userId
    }

    private fun extractSessionId(request: HttpServletRequest): String? {
        val cookies = request.cookies ?: return null
        return cookies.find { it.name == "sessionId" }?.value
    }
}