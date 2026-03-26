package ru.itplanet.trampline.moderation.model.response

data class ModerationTaskAttachmentResponse(
    val id: Long,
    val fileId: Long,
    val originalFileName: String,
    val mediaType: String,
    val sizeBytes: Long,
    val visibility: String,
    val status: String,
    val attachmentRole: String,
    val sortOrder: Int
)
