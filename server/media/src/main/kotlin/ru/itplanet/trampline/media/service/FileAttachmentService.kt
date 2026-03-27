package ru.itplanet.trampline.media.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.dao.FileAssetDao
import ru.itplanet.trampline.commons.dao.FileAttachmentDao
import ru.itplanet.trampline.commons.dao.dto.FileAttachmentDto
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.media.model.request.CreateFileAttachmentRequest

@Service
class FileAttachmentService(
    private val fileAssetDao: FileAssetDao,
    private val fileAttachmentDao: FileAttachmentDao,
) {

    @Transactional
    fun create(request: CreateFileAttachmentRequest): FileAttachmentDto {
        val fileAsset = fileAssetDao.findById(request.fileId)
            .orElseThrow { fileNotFound() }

        if (fileAsset.status == FileAssetStatus.DELETED) {
            throw fileNotFound()
        }

        if (fileAsset.status != FileAssetStatus.READY) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "File must be in READY status to be attached. Current status: ${fileAsset.status.name}"
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
                "File is already attached to this entity with this role"
            )
        }

        return try {
            fileAttachmentDao.save(
                FileAttachmentDto().apply {
                    fileId = request.fileId
                    entityType = request.entityType
                    entityId = request.entityId
                    attachmentRole = request.attachmentRole
                    sortOrder = request.sortOrder
                }
            )
        } catch (ex: DataIntegrityViolationException) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "File is already attached to this entity with this role",
                ex
            )
        }
    }

    private fun fileNotFound(): ResponseStatusException {
        return ResponseStatusException(HttpStatus.NOT_FOUND, "File not found")
    }
}
