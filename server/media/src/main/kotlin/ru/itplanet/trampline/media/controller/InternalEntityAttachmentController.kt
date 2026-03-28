package ru.itplanet.trampline.media.controller

import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.media.mapper.toInternalFileAttachmentResponse
import ru.itplanet.trampline.media.service.FileAttachmentService

@Validated
@RestController
@RequestMapping("/internal/entities")
class InternalEntityAttachmentController(
    private val fileAttachmentService: FileAttachmentService,
) {

    @GetMapping("/{entityType}/{entityId}/attachments")
    fun getAttachments(
        @PathVariable entityType: FileAttachmentEntityType,
        @PathVariable @Positive entityId: Long,
    ): List<InternalFileAttachmentResponse> {
        return fileAttachmentService.getByEntity(entityType, entityId)
            .map { it.toInternalFileAttachmentResponse() }
    }
}
