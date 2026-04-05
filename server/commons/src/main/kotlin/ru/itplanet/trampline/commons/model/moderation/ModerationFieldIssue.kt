package ru.itplanet.trampline.commons.model.moderation

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ModerationFieldIssue(
    @field:NotBlank(message = "Поле обязательно")
    @field:Size(max = 200, message = "Имя поля не должно превышать 200 символов")
    val field: String,

    @field:NotBlank(message = "Комментарий по полю обязателен")
    @field:Size(max = 2000, message = "Комментарий по полю не должен превышать 2000 символов")
    val message: String,

    @field:Size(max = 100, message = "Код замечания не должен превышать 100 символов")
    val code: String? = null,
)
