package ru.itplanet.trampline.auth.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.auth.dao.dto.EmptyEmployerProfileDto

interface EmployerProfileDao : JpaRepository<EmptyEmployerProfileDto, Long>
