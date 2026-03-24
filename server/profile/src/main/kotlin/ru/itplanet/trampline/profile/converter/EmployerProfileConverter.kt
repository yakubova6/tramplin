package ru.itplanet.trampline.profile.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.EmployerProfile

@Component
class EmployerProfileConverter {

    fun toDto(source: EmployerProfile): EmployerProfileDto {
        return EmployerProfileDto(
            userId = source.userId,
            companyName = source.companyName,
            legalName = source.legalName,
            inn = source.inn,
            description = source.description,
            industry = source.industry,
            websiteUrl = source.websiteUrl,
            socialLinks = source.socialLinks,
            publicContacts = source.publicContacts,
            companySize = source.companySize,
            foundedYear = source.foundedYear,
            cityId = source.cityId,
            locationId = source.locationId,
            verificationStatus = source.verificationStatus,
        )
    }

    fun fromDto(source: EmployerProfileDto): EmployerProfile {
        return EmployerProfile(
            userId = source.userId,
            companyName = source.companyName,
            legalName = source.legalName,
            inn = source.inn,
            description = source.description,
            industry = source.industry,
            websiteUrl = source.websiteUrl,
            socialLinks = source.socialLinks,
            publicContacts = source.publicContacts,
            companySize = source.companySize,
            foundedYear = source.foundedYear,
            cityId = source.cityId,
            locationId = source.locationId,
            verificationStatus = source.verificationStatus,
        )
    }
}