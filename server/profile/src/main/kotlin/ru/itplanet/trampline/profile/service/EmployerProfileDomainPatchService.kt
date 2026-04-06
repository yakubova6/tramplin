package ru.itplanet.trampline.profile.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.model.file.*
import ru.itplanet.trampline.profile.client.MediaServiceClient
import ru.itplanet.trampline.profile.converter.EmployerProfileConverter
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest
import ru.itplanet.trampline.profile.validation.EmployerProfileDomainValidator

@Service
class EmployerProfileDomainPatchService(
    private val employerProfileDao: EmployerProfileDao,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val mediaServiceClient: MediaServiceClient,
    private val employerProfileConverter: EmployerProfileConverter,
    private val validator: EmployerProfileDomainValidator
) {

    @Transactional
    fun applyPatch(profileId: Long, request: EmployerProfilePatchRequest): EmployerProfile {
        val profile = employerProfileDao.findById(profileId)
            .orElseThrow {
                ProfileNotFoundException("Профиль не найден", "profile_not_found")
            }

        applyChanges(profile, request)

        validator.validate(profile)

        val saved = employerProfileDao.save(profile)
        return buildEmployerProfile(saved)
    }

    private fun applyChanges(profile: EmployerProfileDto, request: EmployerProfilePatchRequest) {
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

        request.cityId?.let { cityId ->
            profile.city = cityDao.findById(cityId)
                .orElseThrow {
                    ProfileNotFoundException(
                        message = "Город с идентификатором $cityId не найден",
                        code = "city_not_found",
                    )
                }
        }

        request.locationId?.let { locationId ->
            profile.location = locationDao.findById(locationId)
                .orElseThrow {
                    ProfileNotFoundException(
                        message = "Локация с идентификатором $locationId не найдена",
                        code = "location_not_found",
                    )
                }
        }
    }

    private fun buildEmployerProfile(
        profileDto: EmployerProfileDto,
        logo: InternalFileMetadataResponse? = loadEmployerSingleFileOrNull(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.LOGO,
            visibility = FileAssetVisibility.PUBLIC,
            logSubject = "логотип работодателя",
        ),
    ): EmployerProfile {
        return employerProfileConverter.fromDto(profileDto).copy(
            logo = logo,
        )
    }

    private fun loadEmployerSingleFileOrNull(
        userId: Long,
        attachmentRole: FileAttachmentRole,
        visibility: FileAssetVisibility,
        logSubject: String,
    ): InternalFileMetadataResponse? {
        return loadEmployerAttachments(
            userId = userId,
            attachmentRole = attachmentRole,
            visibility = visibility,
            logSubject = logSubject,
        ).maxByOrNull { it.attachmentId }
            ?.file
    }

    private fun loadEmployerAttachments(
        userId: Long,
        attachmentRole: FileAttachmentRole,
        visibility: FileAssetVisibility,
        logSubject: String,
    ): List<InternalFileAttachmentResponse> {
        return try {
            mediaServiceClient.getAttachments(
                entityType = FileAttachmentEntityType.EMPLOYER_PROFILE,
                entityId = userId,
            ).filter { it.attachmentRole == attachmentRole }
                .map { it.withFileVisibility(visibility) }
        } catch (ex: Exception) {
            logger.warn("Не удалось загрузить {} для userId={}", logSubject, userId, ex)
            emptyList()
        }
    }

    private fun InternalFileAttachmentResponse.withFileVisibility(
        visibility: FileAssetVisibility,
    ): InternalFileAttachmentResponse {
        return copy(
            file = file.toProfileFileMetadata(visibility),
        )
    }

    private fun InternalFileMetadataResponse.toProfileFileMetadata(
        visibility: FileAssetVisibility = this.visibility,
    ): InternalFileMetadataResponse {
        return copy(
            visibility = visibility,
        )
    }

    private companion object {
        private val logger = LoggerFactory.getLogger(ProfileServiceImpl::class.java)

        private const val NO_TAG_ID_PLACEHOLDER = -1L

        private val applicantDownloadRoles = setOf(
            FileAttachmentRole.AVATAR,
            FileAttachmentRole.RESUME,
            FileAttachmentRole.PORTFOLIO,
        )

        private val employerDownloadRoles = setOf(
            FileAttachmentRole.LOGO,
        )
    }
}
