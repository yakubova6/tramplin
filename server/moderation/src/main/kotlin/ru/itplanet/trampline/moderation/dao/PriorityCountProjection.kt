package ru.itplanet.trampline.moderation.dao

import ru.itplanet.trampline.moderation.model.ModerationTaskPriority

interface PriorityCountProjection {
    fun getPriority(): ModerationTaskPriority
    fun getCount(): Long
}
