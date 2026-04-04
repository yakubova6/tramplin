package ru.itplanet.trampline.media.service

import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.media.exception.MediaValidationException

@Service
class FileValidationService {

    fun validate(
        file: MultipartFile,
        kind: FileAssetKind,
    ) {
        if (file.isEmpty) {
            throw MediaValidationException("Файл не должен быть пустым")
        }

        val contentType = file.contentType?.lowercase()
            ?: throw MediaValidationException("Не удалось определить content type файла")

        val maxSizeBytes = maxSizeBytes(kind)
        if (file.size > maxSizeBytes) {
            throw MediaValidationException(
                message = "Размер файла превышает допустимый",
                details = mapOf(
                    "maxSizeBytes" to maxSizeBytes.toString(),
                    "actualSizeBytes" to file.size.toString(),
                ),
            )
        }

        val allowedContentTypes = allowedContentTypes(kind)
        if (contentType !in allowedContentTypes) {
            throw MediaValidationException(
                message = "Неподдерживаемый content type для данного типа файла",
                details = mapOf(
                    "kind" to kind.name,
                    "contentType" to contentType,
                    "allowedContentTypes" to allowedContentTypes.joinToString(","),
                ),
            )
        }
    }

    private fun allowedContentTypes(kind: FileAssetKind): Set<String> {
        return when (kind) {
            FileAssetKind.AVATAR,
            FileAssetKind.LOGO,
            FileAssetKind.OPPORTUNITY_MEDIA -> IMAGE_CONTENT_TYPES

            FileAssetKind.RESUME,
            FileAssetKind.VERIFICATION_ATTACHMENT,
            FileAssetKind.APPLICATION_ATTACHMENT -> PDF_CONTENT_TYPES

            FileAssetKind.PORTFOLIO,
            FileAssetKind.MODERATION_ATTACHMENT,
            FileAssetKind.OTHER -> IMAGE_CONTENT_TYPES + PDF_CONTENT_TYPES
        }
    }

    private fun maxSizeBytes(kind: FileAssetKind): Long {
        return when (kind) {
            FileAssetKind.AVATAR,
            FileAssetKind.LOGO,
            FileAssetKind.OPPORTUNITY_MEDIA -> 10L * 1024 * 1024

            FileAssetKind.RESUME,
            FileAssetKind.VERIFICATION_ATTACHMENT,
            FileAssetKind.APPLICATION_ATTACHMENT,
            FileAssetKind.MODERATION_ATTACHMENT -> 20L * 1024 * 1024

            FileAssetKind.PORTFOLIO,
            FileAssetKind.OTHER -> 50L * 1024 * 1024
        }
    }

    companion object {
        private val IMAGE_CONTENT_TYPES = setOf(
            "image/jpeg",
            "image/png",
            "image/webp",
        )

        private val PDF_CONTENT_TYPES = setOf(
            "application/pdf",
        )
    }
}
