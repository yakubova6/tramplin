package ru.itplanet.trampline.interaction.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.interaction.dao.dto.ContactDto
import ru.itplanet.trampline.interaction.dao.dto.ContactDtoId
import ru.itplanet.trampline.interaction.dao.dto.ContactStatus

interface ContactDao : JpaRepository<ContactDto, ContactDtoId> {
    fun findByIdUserHighIdAndStatus(userHighId: Long, status: ContactStatus): List<ContactDto>
    fun findByIdUserLowIdAndStatus(userLowId: Long, status: ContactStatus): List<ContactDto>
    fun existsByIdUserLowIdAndIdUserHighId(userLowId: Long, userHighId: Long): Boolean
    fun findByIdUserLowIdAndIdUserHighId(userLowId: Long, userHighId: Long): ContactDto?
    fun existsByIdUserLowIdAndIdUserHighIdAndStatus(
        userLowId: Long,
        userHighId: Long,
        status: ContactStatus,
    ): Boolean
}
