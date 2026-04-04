package ru.itplanet.trampline.auth.model.request

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

data class GetCuratorsRequest(
    @field:Min(1)
    @field:Max(100)
    val limit: Int = 20,

    @field:Min(0)
    val offset: Long = 0,

    val search: String? = null,
)
