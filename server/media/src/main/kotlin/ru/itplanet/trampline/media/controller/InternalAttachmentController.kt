package ru.itplanet.trampline.media.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.media.mapper.toInternalFileAttachmentResponse
import ru.itplanet.trampline.media.service.FileAttachmentService

@Validated
@RestController
@RequestMapping("/internal/attachments")
class InternalAttachmentController(
    private val fileAttachmentService: FileAttachmentService,
) {

    @PostMapping
    fun create(
        @Valid @RequestBody request: InternalCreateFileAttachmentRequest,
    ): InternalFileAttachmentResponse {
        return fileAttachmentService.create(request)
            .toInternalFileAttachmentResponse()
    }

    @DeleteMapping("/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable @Positive attachmentId: Long,
    ) {
        fileAttachmentService.delete(attachmentId)
    }
}
