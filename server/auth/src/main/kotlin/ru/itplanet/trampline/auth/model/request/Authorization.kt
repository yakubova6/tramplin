package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class Authorization(
    @field:Email
    val email: String?,
    @field:NotBlank(message = "Login must not be empty")
    val login: String?,
    @field:Size(min = 8, max = 16, message = "Password should be between 8 and 16 characters")
    @field:NotBlank(message = "Password must not be empty")
    val password: String?
) {
    fun validToRegistration(): Boolean {
        return email != null && login != null && password != null
    }

}