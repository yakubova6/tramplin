package ru.itplanet.trampline.commons.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole

interface FileAttachmentDao : JpaRepository<FileAttachmentDto, Long> {

    fun existsByFileIdAndEntityTypeAndEntityIdAndAttachmentRole(
        fileId: Long,
        entityType: FileAttachmentEntityType,
        entityId: Long,
        attachmentRole: FileAttachmentRole,
    ): Boolean

    fun existsByFileId(fileId: Long): Boolean

    @Query(
        """
        select attachment
        from FileAttachmentDto attachment
        left join fetch attachment.file file
        where attachment.id = :id
        """
    )
    fun findDetailedById(
        @Param("id") id: Long,
    ): FileAttachmentDto?

    @Query(
        """
        select attachment
        from FileAttachmentDto attachment
        left join fetch attachment.file file
        where attachment.entityType = :entityType
          and attachment.entityId = :entityId
        order by attachment.sortOrder asc, attachment.id asc
        """
    )
    fun findAllDetailedByEntityTypeAndEntityId(
        @Param("entityType") entityType: FileAttachmentEntityType,
        @Param("entityId") entityId: Long,
    ): List<FileAttachmentDto>
}
