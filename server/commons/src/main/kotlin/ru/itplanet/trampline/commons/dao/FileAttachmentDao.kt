package ru.itplanet.trampline.commons.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole

interface FileAttachmentDao : JpaRepository<FileAttachmentDto, Long> {

    fun findAllByEntityTypeAndEntityIdOrderBySortOrderAscIdAsc(
        entityType: FileAttachmentEntityType,
        entityId: Long,
    ): List<FileAttachmentDto>

    fun existsByFileIdAndEntityTypeAndEntityIdAndAttachmentRole(
        fileId: Long,
        entityType: FileAttachmentEntityType,
        entityId: Long,
        attachmentRole: FileAttachmentRole,
    ): Boolean
}
