package ru.itplanet.trampline.media.service

import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.dao.FileAssetDao
import ru.itplanet.trampline.commons.dao.FileAttachmentDao
import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest

@Service
class FileAttachmentService(
    private val fileAssetDao: FileAssetDao,
    private val fileAttachmentDao: FileAttachmentDao,
    private val fileAssetCleanupService: FileAssetCleanupService,
    private val transactionTemplate: TransactionTemplate,
) {

    @PersistenceContext
    private lateinit var entityManager: EntityManager

    @Transactional
    fun create(request: InternalCreateFileAttachmentRequest): FileAttachmentDto {
        val fileAsset = fileAssetDao.findById(request.fileId)
            .orElseThrow { fileNotFound() }

        if (fileAsset.status == FileAssetStatus.DELETED) {
            throw fileNotFound()
        }

        if (fileAsset.status != FileAssetStatus.READY) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "File must be in READY status to be attached. Current status: ${fileAsset.status.name}",
            )
        }

        if (
            fileAttachmentDao.existsByFileIdAndEntityTypeAndEntityIdAndAttachmentRole(
                fileId = request.fileId,
                entityType = request.entityType,
                entityId = request.entityId,
                attachmentRole = request.attachmentRole,
            )
        ) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "File is already attached to this entity with this role",
            )
        }

        val savedAttachment = try {
            fileAttachmentDao.saveAndFlush(
                FileAttachmentDto().apply {
                    fileId = request.fileId
                    entityType = request.entityType
                    entityId = request.entityId
                    attachmentRole = request.attachmentRole
                    sortOrder = request.sortOrder
                },
            )
        } catch (ex: DataIntegrityViolationException) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "File is already attached to this entity with this role",
                ex,
            )
        }

        entityManager.detach(savedAttachment)

        return fileAttachmentDao.findDetailedById(savedAttachment.id!!)
            ?: throw IllegalStateException("Created attachment ${savedAttachment.id} not found")
    }

    @Transactional(readOnly = true)
    fun getByEntity(
        entityType: FileAttachmentEntityType,
        entityId: Long,
    ): List<FileAttachmentDto> {
        return fileAttachmentDao.findAllDetailedByEntityTypeAndEntityId(
            entityType = entityType,
            entityId = entityId,
        )
    }

    fun delete(attachmentId: Long) {
        val fileId = transactionTemplate.execute<Long> {
            val attachment = fileAttachmentDao.findById(attachmentId)
                .orElseThrow { attachmentNotFound() }

            val detachedFileId = attachment.fileId

            fileAttachmentDao.delete(attachment)
            fileAttachmentDao.flush()

            detachedFileId
        } ?: throw IllegalStateException("Attachment delete transaction returned null file id")

        fileAssetCleanupService.cleanupIfOrphaned(fileId)
    }

    private fun fileNotFound(): ResponseStatusException {
        return ResponseStatusException(HttpStatus.NOT_FOUND, "File not found")
    }

    private fun attachmentNotFound(): ResponseStatusException {
        return ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found")
    }
}
