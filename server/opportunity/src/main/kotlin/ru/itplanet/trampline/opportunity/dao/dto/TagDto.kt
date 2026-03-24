package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.enums.TagCategory
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus

@Entity
@Table(name = "tag")
open class TagDto : BaseLongIdEntity() {

    @Column(name = "name", nullable = false, length = 100)
    var name: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 32)
    var category: TagCategory = TagCategory.TECH

    @Enumerated(EnumType.STRING)
    @Column(name = "created_by_type", nullable = false, length = 32)
    var createdByType: CreatedByType = CreatedByType.SYSTEM

    @Column(name = "created_by_user_id")
    var createdByUserId: Long? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false, length = 32)
    var moderationStatus: TagModerationStatus = TagModerationStatus.APPROVED

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true
}
