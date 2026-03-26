package ru.itplanet.trampline.moderation.model.response

data class ModerationTaskPageResponse(
    val items: List<ModerationTaskListItemResponse>,
    val page: Int,
    val size: Int,
    val totalItems: Long,
    val totalPages: Int
)
