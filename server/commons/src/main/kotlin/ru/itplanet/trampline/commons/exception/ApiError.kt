package ru.itplanet.trampline.commons.exception

import java.time.OffsetDateTime
import java.time.ZoneOffset

data class ApiError(
    val status: Int,
    val error: String,
    val message: String,
    val details: Map<String, String> = emptyMap(),
    val timestamp: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC)
)
