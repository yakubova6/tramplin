package ru.itplanet.trampline.auth.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.auth.dao.ApplicantProfileDao
import ru.itplanet.trampline.auth.dao.EmployerProfileDao
import ru.itplanet.trampline.auth.dao.dto.EmptyApplicantProfileDto
import ru.itplanet.trampline.auth.dao.dto.EmptyEmployerProfileDto
import ru.itplanet.trampline.commons.model.Role

@Service
class RegistrationProfileService(
    private val applicantProfileDao: ApplicantProfileDao,
    private val employerProfileDao: EmployerProfileDao
) {

    @Transactional(propagation = Propagation.MANDATORY)
    fun createInitialProfile(userId: Long, role: Role) {
        when (role) {
            Role.APPLICANT -> createApplicantProfile(userId)
            Role.EMPLOYER -> createEmployerProfile(userId)
            Role.CURATOR, Role.ADMIN -> Unit
        }
    }

    private fun createApplicantProfile(userId: Long) {
        if (applicantProfileDao.existsById(userId)) {
            return
        }

        applicantProfileDao.saveAndFlush(
            EmptyApplicantProfileDto(userId = userId)
        )
    }

    private fun createEmployerProfile(userId: Long) {
        if (employerProfileDao.existsById(userId)) {
            return
        }

        employerProfileDao.saveAndFlush(
            EmptyEmployerProfileDto(userId = userId)
        )
    }
}
