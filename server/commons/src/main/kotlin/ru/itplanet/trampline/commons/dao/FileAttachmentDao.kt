package ru.itplanet.trampline.commons.dao

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole

interface FileAttachmentDao : JpaRepository<FileAttachmentDto, Long> {

    @EntityGraph(attributePaths = ["file"])
    fun findOneById(id: Long): FileAttachmentDto?

    @EntityGraph(attributePaths = ["file"])
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

    fun existsByFileId(fileId: Long): Boolean
}
