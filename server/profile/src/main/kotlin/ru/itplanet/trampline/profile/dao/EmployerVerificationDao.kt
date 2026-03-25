package ru.itplanet.trampline.profile.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.profile.dao.dto.EmployerVerificationDto
import ru.itplanet.trampline.profile.model.enums.VerificationStatus

interface EmployerVerificationDao : JpaRepository<EmployerVerificationDto, Long> {

    fun existsByEmployerUserIdAndStatus(employerUserId: Long, status: VerificationStatus): Boolean
}