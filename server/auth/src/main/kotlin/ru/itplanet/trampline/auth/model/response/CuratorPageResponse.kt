package ru.itplanet.trampline.auth.model.response

data class CuratorPageResponse(
    val items: List<CuratorListItemResponse>,
    val limit: Int,
    val offset: Long,
    val total: Long,
)
