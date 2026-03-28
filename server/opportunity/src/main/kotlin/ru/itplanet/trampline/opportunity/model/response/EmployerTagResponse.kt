package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.commons.model.enums.TagCategory
import ru.itplanet.trampline.opportunity.model.enums.CreatedByType
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus

data class EmployerTagResponse(
    val id: Long,
    val name: String,
    val category: TagCategory,
    val createdByType: CreatedByType,
    val createdByUserId: Long?,
    val moderationStatus: TagModerationStatus,
    val isActive: Boolean,
)
