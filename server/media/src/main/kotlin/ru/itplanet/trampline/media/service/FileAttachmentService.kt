package ru.itplanet.trampline.media.service

import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import ru.itplanet.trampline.commons.dao.FileAssetDao
import ru.itplanet.trampline.commons.dao.FileAttachmentDao
import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.media.exception.MediaConflictException
import ru.itplanet.trampline.media.exception.MediaNotFoundException

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
            .orElseThrow {
                MediaNotFoundException(
                    message = "Файл не найден",
                    code = "file_not_found",
                )
            }

        if (fileAsset.status == FileAssetStatus.DELETED) {
            throw MediaNotFoundException(
                message = "Файл не найден",
                code = "file_not_found",
            )
        }

        if (fileAsset.status != FileAssetStatus.READY) {
            throw MediaConflictException(
                message = "Прикрепить можно только файл в статусе READY",
                code = "file_attachment_not_ready",
                details = mapOf("status" to fileAsset.status.name),
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
            throw MediaConflictException(
                message = "Файл уже прикреплён к этой сущности с данной ролью",
                code = "file_already_attached",
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
            throw MediaConflictException(
                message = "Файл уже прикреплён к этой сущности с данной ролью",
                code = "file_already_attached",
            )
        }

        entityManager.detach(savedAttachment)

        return fileAttachmentDao.findDetailedById(savedAttachment.id!!)
            ?: throw IllegalStateException("Созданное вложение ${savedAttachment.id} не найдено")
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
                .orElseThrow {
                    MediaNotFoundException(
                        message = "Вложение не найдено",
                        code = "attachment_not_found",
                    )
                }

            val detachedFileId = attachment.fileId

            fileAttachmentDao.delete(attachment)
            fileAttachmentDao.flush()

            detachedFileId
        } ?: throw IllegalStateException("Транзакция удаления вложения вернула пустой fileId")

        fileAssetCleanupService.cleanupIfOrphaned(fileId)
    }
}
