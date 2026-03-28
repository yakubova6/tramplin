package ru.itplanet.trampline.profile.service

import jakarta.persistence.EntityNotFoundException
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Primary
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.profile.client.MediaServiceClient
import ru.itplanet.trampline.profile.converter.ApplicantProfileConverter
import ru.itplanet.trampline.profile.converter.EmployerProfileConverter
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
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
    private val employerProfileConverter: EmployerProfileConverter,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val mediaServiceClient: MediaServiceClient,
) : ProfileService {

    override fun patchApplicantProfile(
        userId: Long,
        request: ApplicantProfilePatchRequest,
    ): ApplicantProfile {
        val profile = loadApplicantProfileDto(userId)

        request.firstName?.let { profile.firstName = it }
        request.lastName?.let { profile.lastName = it }
        request.middleName?.let { profile.middleName = it }
        request.universityName?.let { profile.universityName = it }
        request.facultyName?.let { profile.facultyName = it }
        request.studyProgram?.let { profile.studyProgram = it }
        request.course?.let { profile.course = it }
        request.graduationYear?.let { profile.graduationYear = it }
        request.cityId?.let {
            profile.city = cityDao.findById(it)
                .orElseThrow { EntityNotFoundException("Unknown city") }
        }
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

        val savedProfile = applicantProfileDao.save(profile)
        return buildApplicantProfile(savedProfile)
    }

    override fun putApplicantAvatar(
        userId: Long,
        file: MultipartFile,
    ): ApplicantProfile {
        val profile = loadApplicantProfileDto(userId)
        val previousAvatarAttachmentIds = getApplicantAvatarAttachments(userId)
            .map { it.attachmentId }

        val createdFile = mediaServiceClient.uploadFile(
            file = file,
            ownerUserId = userId,
            kind = FileAssetKind.AVATAR,
            visibility = profile.profileVisibility.toFileVisibility(),
        )

        val createdAttachment = mediaServiceClient.createAttachment(
            InternalCreateFileAttachmentRequest(
                fileId = createdFile.fileId,
                entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
                entityId = userId,
                attachmentRole = FileAttachmentRole.AVATAR,
            ),
        )

        detachPreviousApplicantAvatarAttachments(
            userId = userId,
            attachmentIds = previousAvatarAttachmentIds,
        )

        return buildApplicantProfile(
            profileDto = profile,
            avatar = createdAttachment.file.toProfileFileMetadata(),
        )
    }

    override fun patchEmployerProfile(
        userId: Long,
        request: EmployerProfilePatchRequest,
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
        request.cityId?.let {
            profile.city = cityDao.findById(it)
                .orElseThrow { EntityNotFoundException("Unknown city") }
        }
        request.cityId?.let {
            profile.location = locationDao.findById(it)
                .orElseThrow { EntityNotFoundException("Unknown location") }
        }

        return employerProfileConverter.fromDto(employerProfileDao.save(profile))
    }

    override fun getApplicantProfile(
        currentUserId: Long,
        targetUserId: Long,
    ): ApplicantProfile {
        val profileDto = loadApplicantProfileDto(targetUserId)

        if (targetUserId == currentUserId) {
            return buildApplicantProfile(profileDto)
        }

        return when (profileDto.profileVisibility) {
            ProfileVisibility.PUBLIC -> buildApplicantProfile(profileDto)
            ProfileVisibility.AUTHENTICATED -> buildApplicantProfile(profileDto)
            ProfileVisibility.PRIVATE -> throw AccessDeniedException("This profile is private")
        }
    }

    override fun getEmployerProfile(
        currentUserId: Long,
        targetUserId: Long,
    ): EmployerProfile {
        val profileDto = employerProfileDao.findById(targetUserId)
            .orElseThrow { EntityNotFoundException("Employer profile for user $targetUserId not found") }

        if (targetUserId == currentUserId) {
            return employerProfileConverter.fromDto(profileDto)
        }

        return employerProfileConverter.fromDto(profileDto)
    }

    private fun loadApplicantProfileDto(userId: Long): ApplicantProfileDto {
        return applicantProfileDao.findById(userId)
            .orElseThrow { EntityNotFoundException("Applicant profile for user $userId not found") }
    }

    private fun buildApplicantProfile(
        profileDto: ApplicantProfileDto,
        avatar: InternalFileMetadataResponse? = loadApplicantAvatarOrNull(profileDto.userId),
    ): ApplicantProfile {
        return applicantProfileConverter.fromDto(profileDto).copy(
            avatar = avatar,
        )
    }

    private fun loadApplicantAvatarOrNull(userId: Long): InternalFileMetadataResponse? {
        return try {
            getApplicantAvatarAttachments(userId)
                .maxByOrNull { it.attachmentId }
                ?.file
                ?.toProfileFileMetadata()
        } catch (ex: Exception) {
            logger.warn("Failed to load applicant avatar for user {}", userId, ex)
            null
        }
    }

    private fun getApplicantAvatarAttachments(userId: Long): List<InternalFileAttachmentResponse> {
        return mediaServiceClient.getAttachments(
            entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
            entityId = userId,
        ).filter { it.attachmentRole == FileAttachmentRole.AVATAR }
    }

    private fun detachPreviousApplicantAvatarAttachments(
        userId: Long,
        attachmentIds: List<Long>,
    ) {
        attachmentIds.forEach { attachmentId ->
            try {
                mediaServiceClient.deleteAttachment(attachmentId)
            } catch (ex: Exception) {
                logger.warn(
                    "Failed to delete previous applicant avatar attachment {} for user {}",
                    attachmentId,
                    userId,
                    ex,
                )
            }
        }
    }

    private fun InternalFileMetadataResponse.toProfileFileMetadata(): InternalFileMetadataResponse {
        return InternalFileMetadataResponse(
            fileId = fileId,
            ownerUserId = ownerUserId,
            storageProvider = storageProvider,
            originalFileName = originalFileName,
            mediaType = mediaType,
            sizeBytes = sizeBytes,
            checksumSha256 = checksumSha256,
            status = status,
            kind = kind,
            visibility = visibility,
            createdAt = createdAt,
            updatedAt = updatedAt,
        )
    }

    private fun ProfileVisibility.toFileVisibility(): FileAssetVisibility {
        return when (this) {
            ProfileVisibility.PUBLIC -> FileAssetVisibility.PUBLIC
            ProfileVisibility.AUTHENTICATED -> FileAssetVisibility.AUTHENTICATED
            ProfileVisibility.PRIVATE -> FileAssetVisibility.PRIVATE
        }
    }

    private companion object {
        private val logger = LoggerFactory.getLogger(ProfileServiceImpl::class.java)
    }
}
