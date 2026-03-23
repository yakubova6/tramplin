package ru.itplanet.trampline.auth.util

import org.springframework.stereotype.Component
import java.util.Locale

@Component
class EmailNormalizer {

    fun normalize(email: String): String {
        return email.trim().lowercase(Locale.ROOT)
    }
}
