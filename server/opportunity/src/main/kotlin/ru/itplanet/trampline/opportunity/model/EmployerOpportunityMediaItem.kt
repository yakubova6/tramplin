package ru.itplanet.trampline.opportunity.model

data class EmployerOpportunityMediaItem(
    val attachmentId: Long,
    val fileId: Long,
    val originalFileName: String,
    val mediaType: String,
    val sortOrder: Int,
    val downloadUrl: String?,
)
