package ru.itplanet.trampline.media.controller

import jakarta.validation.constraints.Positive
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.media.model.response.CreatedFileResponse
import ru.itplanet.trampline.media.model.response.FileDownloadUrlResponse
import ru.itplanet.trampline.media.model.response.FileMetadataResponse
import ru.itplanet.trampline.media.service.FileAssetService

@Validated
@RestController
@RequestMapping("/internal/files")
class InternalFileController(
    private val fileAssetService: FileAssetService
) {

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun upload(
        @RequestPart("file") file: MultipartFile,
        @RequestParam @Positive ownerUserId: Long,
        @RequestParam kind: FileAssetKind,
        @RequestParam visibility: FileAssetVisibility,
    ): CreatedFileResponse {
        val createdFile = fileAssetService.upload(
            file = file,
            kind = kind,
            ownerUserId = ownerUserId,
            visibility = visibility,
        )

        return CreatedFileResponse.from(createdFile)
    }

    @GetMapping("/{fileId}")
    fun getMetadata(
        @PathVariable @Positive fileId: Long,
    ): FileMetadataResponse {
        val fileAsset = fileAssetService.getMetadata(fileId)
        return FileMetadataResponse.from(fileAsset)
    }

    @GetMapping("/{fileId}/download-url")
    fun getDownloadUrl(
        @PathVariable @Positive fileId: Long,
    ): FileDownloadUrlResponse {
        val presignedUrl = fileAssetService.getDownloadUrl(fileId)
        return FileDownloadUrlResponse.from(presignedUrl)
    }
}
