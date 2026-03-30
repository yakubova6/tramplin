package ru.itplanet.trampline.auth.service

import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service
import ru.itplanet.trampline.auth.config.PasswordResetProperties

@Service
class PasswordResetMailService(
    private val mailSender: JavaMailSender,
    private val passwordResetProperties: PasswordResetProperties
) {

    fun sendPasswordResetCode(email: String, code: String) {
        val message = SimpleMailMessage()

        if (passwordResetProperties.mailFrom.isNotBlank()) {
            message.from = passwordResetProperties.mailFrom
        }

        message.setTo(email)
        message.subject = passwordResetProperties.subject
        message.text = """
            Здравствуйте!
            
            Вы запросили сброс пароля в Trampline.
            Код подтверждения: $code
            
            Код действует ${passwordResetProperties.codeTtlMinutes} минут.
            Если это были не вы, просто проигнорируйте это письмо.
        """.trimIndent()

        mailSender.send(message)
    }
}
