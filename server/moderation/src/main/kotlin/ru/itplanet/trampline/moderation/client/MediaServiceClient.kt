package ru.itplanet.trampline.moderation.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalCreatedFileResponse
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse

@FeignClient(
    name = "moderation-media-service-client",
    url = "\${media.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface MediaServiceClient {

    @PostMapping(
        value = ["/internal/files"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun uploadFile(
        @RequestPart("file") file: MultipartFile,
        @RequestParam ownerUserId: Long,
        @RequestParam kind: FileAssetKind,
        @RequestParam visibility: FileAssetVisibility,
    ): InternalCreatedFileResponse

    @PostMapping("/internal/attachments")
    fun createAttachment(
        @RequestBody request: InternalCreateFileAttachmentRequest,
    ): InternalFileAttachmentResponse
}
