package ru.itplanet.trampline.profile.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto

interface EmployerProfileDao : JpaRepository<EmployerProfileDto, Long>
