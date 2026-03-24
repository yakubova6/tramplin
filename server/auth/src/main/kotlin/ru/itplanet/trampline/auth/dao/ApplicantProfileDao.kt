package ru.itplanet.trampline.auth.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.auth.dao.dto.ApplicantProfileDto

interface ApplicantProfileDao : JpaRepository<ApplicantProfileDto, Long>
