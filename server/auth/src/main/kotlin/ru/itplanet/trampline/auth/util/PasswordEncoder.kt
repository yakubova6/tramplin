package ru.itplanet.trampline.auth.util

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

object PasswordEncoder {
    private val encoder = BCryptPasswordEncoder()

    fun encode(password: String?): String {
        return encoder.encode(password)
    }

    fun matches(rawPassword: String?, encodedPassword: String?): Boolean {
        return encoder.matches(
            rawPassword,
            encodedPassword
        )
    }
}
