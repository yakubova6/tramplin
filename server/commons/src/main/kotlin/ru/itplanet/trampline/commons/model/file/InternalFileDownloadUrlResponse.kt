package ru.itplanet.trampline.commons.model.file

import java.time.OffsetDateTime

data class InternalFileDownloadUrlResponse(
    val url: String,
    val expiresAt: OffsetDateTime,
)
