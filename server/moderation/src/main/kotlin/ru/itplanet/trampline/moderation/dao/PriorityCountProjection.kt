package ru.itplanet.trampline.moderation.dao

import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority

interface PriorityCountProjection {
    fun getPriority(): ModerationTaskPriority
    fun getCount(): Long
}
