package ru.itplanet.trampline.media.controller

import jakarta.validation.Valid
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.media.model.request.CreateFileAttachmentRequest
import ru.itplanet.trampline.media.model.response.FileAttachmentResponse
import ru.itplanet.trampline.media.service.FileAttachmentService

@Validated
@RestController
@RequestMapping("/internal/attachments")
class InternalAttachmentController(
    private val fileAttachmentService: FileAttachmentService
) {

    @PostMapping
    fun create(
        @Valid @RequestBody request: CreateFileAttachmentRequest,
    ): FileAttachmentResponse {
        val attachment = fileAttachmentService.create(request)
        return FileAttachmentResponse.from(attachment)
    }
}
