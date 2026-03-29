package ru.itplanet.trampline.interaction.model.response

data class EmployerResponsePage<T>(
    val items: List<T>,
    val limit: Int,
    val offset: Long,
    val total: Long,
)
