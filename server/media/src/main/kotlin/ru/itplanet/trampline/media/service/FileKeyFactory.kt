package ru.itplanet.trampline.media.service

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.media.config.S3StorageProperties
import java.util.UUID

@Component
class FileKeyFactory(
    private val properties: S3StorageProperties,
) {

    fun buildKey(
        kind: FileAssetKind,
        ownerUserId: Long?,
        originalFileName: String,
    ): String {
        val ownerPart = ownerUserId?.toString() ?: "anonymous"
        val sanitizedFileName = sanitizeFileName(originalFileName)

        return buildString {
            append(properties.keyPrefix.trim('/'))
            append('/')
            append(kind.name.lowercase())
            append('/')
            append(ownerPart)
            append('/')
            append(UUID.randomUUID())
            append('_')
            append(sanitizedFileName)
        }
    }

    private fun sanitizeFileName(originalFileName: String): String {
        val fileName = originalFileName.ifBlank { "file.bin" }

        return fileName
            .replace("\\s+".toRegex(), "_")
            .replace("[^a-zA-Z0-9._-]".toRegex(), "_")
            .take(255)
    }
}
