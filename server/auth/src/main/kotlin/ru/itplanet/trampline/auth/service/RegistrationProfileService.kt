package ru.itplanet.trampline.auth.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.ApplicantProfileDao
import ru.itplanet.trampline.commons.dao.EmployerProfileDao
import ru.itplanet.trampline.commons.dao.dto.ApplicantProfileDto
import ru.itplanet.trampline.commons.dao.dto.EmployerProfileDto
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
            ApplicantProfileDto(userId = userId)
        )
    }

    private fun createEmployerProfile(userId: Long) {
        if (employerProfileDao.existsById(userId)) {
            return
        }

        employerProfileDao.saveAndFlush(
            EmployerProfileDto(userId = userId)
        )
    }
}
