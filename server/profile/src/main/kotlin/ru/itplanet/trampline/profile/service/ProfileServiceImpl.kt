package ru.itplanet.trampline.profile.service

import jakarta.persistence.EntityNotFoundException
import org.springframework.context.annotation.Primary
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import ru.itplanet.trampline.profile.converter.ApplicantProfileConverter
import ru.itplanet.trampline.profile.converter.EmployerProfileConverter
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest

@Primary
@Service
class ProfileServiceImpl(
    private val applicantProfileDao: ApplicantProfileDao,
    private val employerProfileDao: EmployerProfileDao,
    private val applicantProfileConverter: ApplicantProfileConverter,
    private val employerProfileConverter: EmployerProfileConverter
) : ProfileService {
    override fun patchApplicantProfile(
        userId: Long,
        request: ApplicantProfilePatchRequest
    ): ApplicantProfile {
        val profile = applicantProfileDao.findById(userId)
            .orElseThrow { EntityNotFoundException("Applicant profile for user $userId not found") }

        request.firstName?.let { profile.firstName = it }
        request.lastName?.let { profile.lastName = it }
        request.middleName?.let { profile.middleName = it }
        request.universityName?.let { profile.universityName = it }
        request.facultyName?.let { profile.facultyName = it }
        request.studyProgram?.let { profile.studyProgram = it }
        request.course?.let { profile.course = it }
        request.graduationYear?.let { profile.graduationYear = it }
        request.cityId?.let { profile.cityId = it }
        request.about?.let { profile.about = it }
        request.resumeText?.let { profile.resumeText = it }
        request.portfolioLinks?.let { profile.portfolioLinks = it }
        request.contactLinks?.let { profile.contactLinks = it }
        request.profileVisibility?.let { profile.profileVisibility = it }
        request.resumeVisibility?.let { profile.resumeVisibility = it }
        request.applicationsVisibility?.let { profile.applicationsVisibility = it }
        request.contactsVisibility?.let { profile.contactsVisibility = it }
        request.openToWork?.let { profile.openToWork = it }
        request.openToEvents?.let { profile.openToEvents = it }

        return applicantProfileConverter.fromDto(applicantProfileDao.save(profile))
    }

    override fun patchEmployerProfile(
        userId: Long,
        request: EmployerProfilePatchRequest
    ): EmployerProfile {
        val profile = employerProfileDao.findById(userId)
            .orElseThrow { EntityNotFoundException("Profile for user $userId not found") }

        request.companyName?.let { profile.companyName = it }
        request.legalName?.let { profile.legalName = it }
        request.inn?.let { profile.inn = it }
        request.description?.let { profile.description = it }
        request.industry?.let { profile.industry = it }
        request.websiteUrl?.let { profile.websiteUrl = it }
        request.socialLinks?.let { profile.socialLinks = it }
        request.publicContacts?.let { profile.publicContacts = it }
        request.companySize?.let { profile.companySize = it }
        request.foundedYear?.let { profile.foundedYear = it }
        request.cityId?.let { profile.cityId = it }
        request.locationId?.let { profile.locationId = it }

        return employerProfileConverter.fromDto(employerProfileDao.save(profile))
    }

    override fun getApplicantProfile(currentUserId: Long, targetUserId: Long): ApplicantProfile {
        val profileDto = applicantProfileDao.findById(targetUserId)
            .orElseThrow { EntityNotFoundException("Applicant profile for user $targetUserId not found") }

        if (targetUserId == currentUserId) {
            return applicantProfileConverter.fromDto(profileDto)
        }

        when (profileDto.profileVisibility) {
            ProfileVisibility.PUBLIC -> return applicantProfileConverter.fromDto(profileDto)
            ProfileVisibility.AUTHENTICATED -> {
                return applicantProfileConverter.fromDto(profileDto)
            }

            ProfileVisibility.PRIVATE -> throw AccessDeniedException("This profile is private")
        }
    }

    override fun getEmployerProfile(currentUserId: Long, targetUserId: Long): EmployerProfile {
        val profileDto = employerProfileDao.findById(targetUserId)
            .orElseThrow { EntityNotFoundException("Employer profile for user $targetUserId not found") }

        if (targetUserId == currentUserId) {
            return employerProfileConverter.fromDto(profileDto)
        }

        return employerProfileConverter.fromDto(profileDto)
    }
}