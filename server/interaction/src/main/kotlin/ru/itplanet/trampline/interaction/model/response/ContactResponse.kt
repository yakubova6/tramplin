package ru.itplanet.trampline.interaction.model.response

import ru.itplanet.trampline.interaction.dao.dto.ContactStatus
import java.time.OffsetDateTime

data class ContactResponse(
    val contactUserId: Long,
    val contactName: String?,
    val status: ContactStatus,
    val direction: ContactDirection,
    val createdAt: OffsetDateTime?,
)
