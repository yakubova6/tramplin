package ru.itplanet.trampline.opportunity.service

import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service
import ru.itplanet.trampline.opportunity.converter.TagConverter
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.model.Tag
import ru.itplanet.trampline.opportunity.model.enums.TagCategory
import ru.itplanet.trampline.opportunity.model.enums.TagModerationStatus

@Primary
@Service
class TagServiceImpl(
    private val tagDao: TagDao,
    private val tagConverter: TagConverter
) : TagService {

    override fun getActiveTags(category: TagCategory?): List<Tag> {
        val moderationStatus = TagModerationStatus.APPROVED

        val tags = if (category == null) {
            tagDao.findAllByIsActiveTrueAndModerationStatusOrderByCategoryAscNameAsc(moderationStatus)
        } else {
            tagDao.findAllByIsActiveTrueAndModerationStatusAndCategoryOrderByNameAsc(
                moderationStatus = moderationStatus,
                category = category
            )
        }

        return tags.map(tagConverter::toModel)
    }
}
