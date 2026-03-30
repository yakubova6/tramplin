package ru.itplanet.trampline.auth.service

import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service
import ru.itplanet.trampline.auth.config.TwoFactorProperties

@Service
class TwoFactorMailService(
    private val mailSender: JavaMailSender,
    private val twoFactorProperties: TwoFactorProperties
) {

    fun sendLoginCode(email: String, code: String) {
        send(
            email = email,
            subject = twoFactorProperties.loginSubject,
            text = """
                Здравствуйте!
                
                Код для входа в Tramplin: $code
                
                Код действует ${twoFactorProperties.codeTtlMinutes} минут.
                Никому не сообщайте этот код.
                Если это были не вы, просто проигнорируйте это письмо.
            """.trimIndent()
        )
    }

    fun sendEnableCode(email: String, code: String) {
        send(
            email = email,
            subject = twoFactorProperties.enableSubject,
            text = """
                Здравствуйте!
                
                Вы запросили включение двухфакторной аутентификации в Tramplin.
                Код подтверждения: $code
                
                Код действует ${twoFactorProperties.codeTtlMinutes} минут.
                Если это были не вы, просто проигнорируйте это письмо.
            """.trimIndent()
        )
    }

    fun sendDisableCode(email: String, code: String) {
        send(
            email = email,
            subject = twoFactorProperties.disableSubject,
            text = """
                Здравствуйте!
                
                Вы запросили отключение двухфакторной аутентификации в Tramplin.
                Код подтверждения: $code
                
                Код действует ${twoFactorProperties.codeTtlMinutes} минут.
                Если это были не вы, просто проигнорируйте это письмо.
            """.trimIndent()
        )
    }

    private fun send(
        email: String,
        subject: String,
        text: String
    ) {
        val message = SimpleMailMessage()

        if (twoFactorProperties.mailFrom.isNotBlank()) {
            message.from = twoFactorProperties.mailFrom
        }

        message.setTo(email)
        message.subject = subject
        message.text = text

        mailSender.send(message)
    }
}
