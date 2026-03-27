package ru.itplanet.trampline.media.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.FileAssetDao
import ru.itplanet.trampline.commons.dao.FileAttachmentDao
import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole

@Service
class FileAttachmentService(
    private val fileAssetDao: FileAssetDao,
    private val fileAttachmentDao: FileAttachmentDao,
) {

    @Transactional
    fun attach(
        fileId: Long,
        entityType: FileAttachmentEntityType,
        entityId: Long,
        attachmentRole: FileAttachmentRole,
        sortOrder: Int = 0,
    ): FileAttachmentDto {
        val fileAsset = fileAssetDao.findById(fileId)
            .orElseThrow { NoSuchElementException("File asset $fileId not found") }

        check(fileAsset.status == FileAssetStatus.READY) {
            "Only READY files can be attached"
        }

        val attachment = FileAttachmentDto().apply {
            this.fileId = fileId
            this.entityType = entityType
            this.entityId = entityId
            this.attachmentRole = attachmentRole
            this.sortOrder = sortOrder
        }

        return fileAttachmentDao.save(attachment)
    }

    @Transactional(readOnly = true)
    fun findByEntity(
        entityType: FileAttachmentEntityType,
        entityId: Long,
    ): List<FileAttachmentDto> {
        return fileAttachmentDao.findAllByEntityTypeAndEntityIdOrderBySortOrderAscIdAsc(
            entityType = entityType,
            entityId = entityId,
        )
    }
}
