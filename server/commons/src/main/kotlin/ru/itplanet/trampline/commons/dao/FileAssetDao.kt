package ru.itplanet.trampline.commons.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.dao.dto.FileAssetDto
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileStorageProvider

interface FileAssetDao : JpaRepository<FileAssetDto, Long> {

    fun findByStorageProviderAndStorageKey(
        storageProvider: FileStorageProvider,
        storageKey: String,
    ): FileAssetDto?

    fun findAllByOwnerUserIdAndKind(
        ownerUserId: Long,
        kind: FileAssetKind,
    ): List<FileAssetDto>
}
