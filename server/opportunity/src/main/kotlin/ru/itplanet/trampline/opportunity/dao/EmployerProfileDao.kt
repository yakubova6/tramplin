package ru.itplanet.trampline.opportunity.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.opportunity.dao.dto.EmployerProfileDto
import java.util.*

interface EmployerProfileDao : JpaRepository<EmployerProfileDto, Long> {
    fun findByUserId(id: Long): Optional<EmployerProfileDto>
}
