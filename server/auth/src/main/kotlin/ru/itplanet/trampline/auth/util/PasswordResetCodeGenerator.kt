package ru.itplanet.trampline.auth.util

import org.springframework.stereotype.Component
import java.security.SecureRandom

@Component
class PasswordResetCodeGenerator {

    private val secureRandom = SecureRandom()

    fun generate(): String {
        return secureRandom.nextInt(1_000_000)
            .toString()
            .padStart(6, '0')
    }
}
