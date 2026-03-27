package ru.itplanet.trampline.media.model.response

import ru.itplanet.trampline.media.service.ObjectStorage
import java.time.OffsetDateTime

data class FileDownloadUrlResponse(
    val url: String,
    val expiresAt: OffsetDateTime,
) {
    companion object {
        fun from(presignedUrl: ObjectStorage.PresignedUrl): FileDownloadUrlResponse {
            return FileDownloadUrlResponse(
                url = presignedUrl.url,
                expiresAt = presignedUrl.expiresAt,
            )
        }
    }
}
