package ru.itplanet.trampline.media.controller

import jakarta.validation.constraints.Positive
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.InternalCreatedFileResponse
import ru.itplanet.trampline.commons.model.file.InternalFileDownloadUrlResponse
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.media.mapper.toInternalCreatedFileResponse
import ru.itplanet.trampline.media.mapper.toInternalFileDownloadUrlResponse
import ru.itplanet.trampline.media.mapper.toInternalFileMetadataResponse
import ru.itplanet.trampline.media.service.FileAssetService

@Validated
@RestController
@RequestMapping("/internal/files")
class InternalFileController(
    private val fileAssetService: FileAssetService,
) {

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun upload(
        @RequestPart("file") file: MultipartFile,
        @RequestParam @Positive ownerUserId: Long,
        @RequestParam kind: FileAssetKind,
        @RequestParam visibility: FileAssetVisibility,
    ): InternalCreatedFileResponse {
        return fileAssetService.upload(
            file = file,
            kind = kind,
            ownerUserId = ownerUserId,
            visibility = visibility,
        ).toInternalCreatedFileResponse()
    }

    @GetMapping("/{fileId}")
    fun getMetadata(
        @PathVariable @Positive fileId: Long,
    ): InternalFileMetadataResponse {
        return fileAssetService.getMetadata(fileId)
            .toInternalFileMetadataResponse()
    }

    @GetMapping("/{fileId}/download-url")
    fun getDownloadUrl(
        @PathVariable @Positive fileId: Long,
    ): InternalFileDownloadUrlResponse {
        return fileAssetService.getDownloadUrl(fileId)
            .toInternalFileDownloadUrlResponse()
    }
}
