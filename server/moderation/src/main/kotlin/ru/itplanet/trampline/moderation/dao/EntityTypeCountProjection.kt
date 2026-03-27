package ru.itplanet.trampline.moderation.dao

import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType

interface EntityTypeCountProjection {
    fun getEntityType(): ModerationEntityType
    fun getCount(): Long
}
