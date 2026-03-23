package ru.itplanet.trampline.auth.model.response

data class CsrfResponse(
    val headerName: String,
    val token: String
)
