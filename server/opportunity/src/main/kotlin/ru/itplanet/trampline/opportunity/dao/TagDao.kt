package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.model.enums.TagCategory
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus

interface TagDao : JpaRepository<TagDto, Long> {

    fun findAllByIsActiveTrueAndModerationStatusOrderByCategoryAscNameAsc(
        moderationStatus: TagModerationStatus
    ): List<TagDto>

    fun findAllByIsActiveTrueAndModerationStatusAndCategoryOrderByNameAsc(
        moderationStatus: TagModerationStatus,
        category: TagCategory
    ): List<TagDto>
}
