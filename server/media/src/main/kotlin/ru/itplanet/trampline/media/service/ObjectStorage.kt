package ru.itplanet.trampline.media.service

import java.time.OffsetDateTime

interface ObjectStorage {

    fun putObject(
        key: String,
        bytes: ByteArray,
        contentType: String,
        metadata: Map<String, String> = emptyMap(),
    )

    fun deleteObject(key: String)

    fun generateDownloadUrl(key: String): PresignedUrl

    data class PresignedUrl(
        val url: String,
        val expiresAt: OffsetDateTime,
    )
}
