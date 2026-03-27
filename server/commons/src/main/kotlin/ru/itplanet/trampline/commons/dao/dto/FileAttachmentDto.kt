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
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import java.time.OffsetDateTime

@Entity
@Table(name = "file_attachment")
open class FileAttachmentDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "file_id", nullable = false)
    open var fileId: Long = 0

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", insertable = false, updatable = false)
    open var file: FileAssetDto? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 32)
    open var entityType: FileAttachmentEntityType = FileAttachmentEntityType.APPLICANT_PROFILE

    @Column(name = "entity_id", nullable = false)
    open var entityId: Long = 0

    @Enumerated(EnumType.STRING)
    @Column(name = "attachment_role", nullable = false, length = 32)
    open var attachmentRole: FileAttachmentRole = FileAttachmentRole.ATTACHMENT

    @Column(name = "sort_order", nullable = false)
    open var sortOrder: Int = 0

    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: OffsetDateTime? = null
}
