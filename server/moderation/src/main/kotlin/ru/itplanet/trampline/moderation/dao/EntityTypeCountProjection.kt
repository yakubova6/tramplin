package ru.itplanet.trampline.moderation.dao

import ru.itplanet.trampline.moderation.model.ModerationEntityType

interface EntityTypeCountProjection {
    fun getEntityType(): ModerationEntityType
    fun getCount(): Long
}
