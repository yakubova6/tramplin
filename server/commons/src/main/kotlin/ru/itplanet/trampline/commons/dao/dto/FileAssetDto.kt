package ru.itplanet.trampline.commons.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileStorageProvider
import java.time.OffsetDateTime

@Entity
@Table(name = "file_asset")
open class FileAssetDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "owner_user_id")
    open var ownerUserId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", insertable = false, updatable = false)
    open var ownerUser: UserDto? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_provider", nullable = false, length = 32)
    open var storageProvider: FileStorageProvider = FileStorageProvider.LOCAL

    @Column(name = "storage_key", nullable = false)
    open var storageKey: String = ""

    @Column(name = "original_file_name", nullable = false, length = 255)
    open var originalFileName: String = ""

    @Column(name = "media_type", nullable = false, length = 255)
    open var mediaType: String = ""

    @Column(name = "size_bytes", nullable = false)
    open var sizeBytes: Long = 0

    @Column(name = "checksum_sha256", length = 64)
    open var checksumSha256: String? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 32)
    open var kind: FileAssetKind = FileAssetKind.OTHER

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 32)
    open var visibility: FileAssetVisibility = FileAssetVisibility.PRIVATE

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    open var status: FileAssetStatus = FileAssetStatus.UPLOADING

    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: OffsetDateTime? = null

    @Column(name = "updated_at", nullable = false)
    open var updatedAt: OffsetDateTime? = null
}
