package ru.itplanet.trampline.profile.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
import ru.itplanet.trampline.profile.model.ApplicantProfile

@Component
class ApplicantProfileConverter {

    fun toDto(source: ApplicantProfile): ApplicantProfileDto {
        return ApplicantProfileDto(
            userId = source.userId,
            firstName = source.firstName,
            lastName = source.lastName,
            middleName = source.middleName,
            universityName = source.universityName,
            facultyName = source.facultyName,
            studyProgram = source.studyProgram,
            course = source.course,
            graduationYear = source.graduationYear,
            cityId = source.cityId,
            about = source.about,
            resumeText = source.resumeText,
            portfolioLinks = source.portfolioLinks,
            contactLinks = source.contactLinks,
            profileVisibility = source.profileVisibility,
            resumeVisibility = source.resumeVisibility,
            applicationsVisibility = source.applicationsVisibility,
            contactsVisibility = source.contactsVisibility,
            openToWork = source.openToWork,
            openToEvents = source.openToEvents,
        )
    }

    fun fromDto(source: ApplicantProfileDto): ApplicantProfile {
        return ApplicantProfile(
            userId = source.userId,
            firstName = source.firstName,
            lastName = source.lastName,
            middleName = source.middleName,
            universityName = source.universityName,
            facultyName = source.facultyName,
            studyProgram = source.studyProgram,
            course = source.course,
            graduationYear = source.graduationYear,
            cityId = source.cityId,
            about = source.about,
            resumeText = source.resumeText,
            portfolioLinks = source.portfolioLinks,
            contactLinks = source.contactLinks,
            profileVisibility = source.profileVisibility,
            resumeVisibility = source.resumeVisibility,
            applicationsVisibility = source.applicationsVisibility,
            contactsVisibility = source.contactsVisibility,
            openToWork = source.openToWork,
            openToEvents = source.openToEvents,
        )
    }
}