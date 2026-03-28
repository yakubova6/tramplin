package ru.itplanet.trampline.media.service

import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import ru.itplanet.trampline.commons.dao.FileAssetDao
import ru.itplanet.trampline.commons.dao.FileAttachmentDao
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.media.config.FileCleanupProperties
import java.time.OffsetDateTime

@Service
class FileAssetCleanupService(
    private val fileAssetDao: FileAssetDao,
    private val fileAttachmentDao: FileAttachmentDao,
    private val objectStorage: ObjectStorage,
    private val transactionTemplate: TransactionTemplate,
    private val fileCleanupProperties: FileCleanupProperties,
) {

    fun cleanupIfOrphaned(fileId: Long) {
        val candidate = markDeletedIfOrphaned(fileId) ?: return
        deleteFromStorageAndFinalize(candidate)
    }

    @Scheduled(fixedDelayString = "#{@fileCleanupProperties.fixedDelay.toMillis()}")
    fun cleanupStandaloneOrphanFiles() {
        if (!fileCleanupProperties.enabled) {
            return
        }

        cleanupOldReadyStandaloneFiles()
        retryDeleteMarkedFiles()
    }

    private fun cleanupOldReadyStandaloneFiles() {
        val createdAtBefore = OffsetDateTime.now().minus(fileCleanupProperties.readyFileMinAge)

        val candidates = fileAssetDao.findAllByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
            status = FileAssetStatus.READY,
            createdAtBefore = createdAtBefore,
            pageable = PageRequest.of(0, fileCleanupProperties.batchSize),
        )

        candidates.forEach { fileAsset ->
            val fileId = fileAsset.id ?: return@forEach
            val deletionCandidate = markDeletedIfOrphaned(fileId) ?: return@forEach
            deleteFromStorageAndFinalize(deletionCandidate)
        }
    }

    private fun retryDeleteMarkedFiles() {
        val candidates = fileAssetDao.findAllByStatusOrderByCreatedAtAsc(
            status = FileAssetStatus.DELETED,
            pageable = PageRequest.of(0, fileCleanupProperties.batchSize),
        )

        candidates.forEach { fileAsset ->
            val fileId = fileAsset.id ?: return@forEach
            deleteFromStorageAndFinalize(
                DeletionCandidate(
                    fileId = fileId,
                    storageKey = fileAsset.storageKey,
                ),
            )
        }
    }

    private fun markDeletedIfOrphaned(fileId: Long): DeletionCandidate? {
        return transactionTemplate.execute {
            val fileAsset = fileAssetDao.findById(fileId).orElse(null)
                ?: return@execute null

            if (fileAsset.status != FileAssetStatus.READY && fileAsset.status != FileAssetStatus.DELETED) {
                return@execute null
            }

            if (fileAttachmentDao.existsByFileId(fileId)) {
                return@execute null
            }

            if (fileAsset.status == FileAssetStatus.READY) {
                fileAsset.status = FileAssetStatus.DELETED
                fileAssetDao.save(fileAsset)

                logger.info(
                    "File {} has no attachments, marked as DELETED and queued for object storage cleanup",
                    fileId,
                )
            }

            DeletionCandidate(
                fileId = fileId,
                storageKey = fileAsset.storageKey,
            )
        }
    }

    private fun deleteFromStorageAndFinalize(candidate: DeletionCandidate) {
        try {
            objectStorage.deleteObject(candidate.storageKey)
        } catch (ex: Exception) {
            logger.warn(
                "Failed to delete file {} from object storage, cleanup will retry later",
                candidate.fileId,
                ex,
            )
            return
        }

        transactionTemplate.executeWithoutResult {
            val fileAsset = fileAssetDao.findById(candidate.fileId).orElse(null)
            if (fileAsset == null) {
                logger.info(
                    "File asset record {} is already removed after object storage cleanup",
                    candidate.fileId,
                )
                return@executeWithoutResult
            }

            if (fileAsset.status != FileAssetStatus.DELETED) {
                logger.warn(
                    "Skipping cleanup finalization for file {} because status is {}, expected DELETED",
                    candidate.fileId,
                    fileAsset.status,
                )
                return@executeWithoutResult
            }

            if (fileAttachmentDao.existsByFileId(candidate.fileId)) {
                logger.warn(
                    "Skipping cleanup finalization for file {} because attachments appeared unexpectedly",
                    candidate.fileId,
                )
                return@executeWithoutResult
            }

            fileAssetDao.delete(fileAsset)
        }

        logger.info(
            "Orphaned file {} was deleted from object storage and removed from database",
            candidate.fileId,
        )
    }

    private data class DeletionCandidate(
        val fileId: Long,
        val storageKey: String,
    )

    private companion object {
        private val logger = LoggerFactory.getLogger(FileAssetCleanupService::class.java)
    }
}
