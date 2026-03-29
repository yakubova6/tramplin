package ru.itplanet.trampline.profile.service

import jakarta.persistence.EntityNotFoundException
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Primary
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.file.InternalFileDownloadUrlResponse
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.profile.client.MediaServiceClient
import ru.itplanet.trampline.profile.client.OpportunityTagClient
import ru.itplanet.trampline.profile.converter.ApplicantProfileConverter
import ru.itplanet.trampline.profile.converter.EmployerProfileConverter
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.dao.ApplicantTagDao
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
import ru.itplanet.trampline.profile.dao.dto.ApplicantTagDto
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.enums.ApplicantTagRelationType
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest

@Primary
@Service
class ProfileServiceImpl(
    private val applicantProfileDao: ApplicantProfileDao,
    private val applicantTagDao: ApplicantTagDao,
    private val employerProfileDao: EmployerProfileDao,
    private val applicantProfileConverter: ApplicantProfileConverter,
    private val employerProfileConverter: EmployerProfileConverter,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val mediaServiceClient: MediaServiceClient,
    private val opportunityTagClient: OpportunityTagClient,
) : ProfileService {

    @Transactional
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

        val requestedSkillTagIds = request.skillTagIds?.distinct()
        val requestedInterestTagIds = request.interestTagIds?.distinct()

        if (requestedSkillTagIds != null || requestedInterestTagIds != null) {
            val tagIdsToValidate = buildSet {
                requestedSkillTagIds?.let(::addAll)
                requestedInterestTagIds?.let(::addAll)
            }

            val activeTagsById = requireActiveTagsByIds(tagIdsToValidate)
                .associateBy { it.id }

            requestedSkillTagIds?.let {
                replaceApplicantTags(
                    applicantUserId = userId,
                    relationType = ApplicantTagRelationType.SKILL,
                    tagIds = it,
                    activeTagsById = activeTagsById,
                )
            }

            requestedInterestTagIds?.let {
                replaceApplicantTags(
                    applicantUserId = userId,
                    relationType = ApplicantTagRelationType.INTEREST,
                    tagIds = it,
                    activeTagsById = activeTagsById,
                )
            }
        }

        val savedProfile = applicantProfileDao.save(profile)
        return buildApplicantProfile(savedProfile)
    }

    override fun putApplicantAvatar(
        userId: Long,
        file: MultipartFile,
    ): ApplicantProfile {
        val profile = loadApplicantProfileDto(userId)

        val avatar = replaceSingleAttachment(
            userId = userId,
            file = file,
            kind = FileAssetKind.AVATAR,
            entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
            attachmentRole = FileAttachmentRole.AVATAR,
            visibility = profile.profileVisibility.toFileVisibility(),
            previousAttachmentIds = getApplicantAttachmentIds(userId, FileAttachmentRole.AVATAR),
            logSubject = "applicant avatar",
        )

        return buildApplicantProfile(
            profileDto = profile,
            avatar = avatar,
        )
    }

    override fun putApplicantResumeFile(
        userId: Long,
        file: MultipartFile,
    ): ApplicantProfile {
        val profile = loadApplicantProfileDto(userId)

        val resumeFile = replaceSingleAttachment(
            userId = userId,
            file = file,
            kind = FileAssetKind.RESUME,
            entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
            attachmentRole = FileAttachmentRole.RESUME,
            visibility = profile.resumeVisibility.toFileVisibility(),
            previousAttachmentIds = getApplicantAttachmentIds(userId, FileAttachmentRole.RESUME),
            logSubject = "applicant resume",
        )

        return buildApplicantProfile(
            profileDto = profile,
            resumeFile = resumeFile,
        )
    }

    override fun addApplicantPortfolioFile(
        userId: Long,
        file: MultipartFile,
    ): List<InternalFileAttachmentResponse> {
        val profile = loadApplicantProfileDto(userId)
        val visibility = profile.resumeVisibility.toFileVisibility()

        val createdFile = mediaServiceClient.uploadFile(
            file = file,
            ownerUserId = userId,
            kind = FileAssetKind.PORTFOLIO,
            visibility = visibility,
        )

        mediaServiceClient.createAttachment(
            InternalCreateFileAttachmentRequest(
                fileId = createdFile.fileId,
                entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
                entityId = userId,
                attachmentRole = FileAttachmentRole.PORTFOLIO,
            ),
        )

        return loadApplicantPortfolioAttachments(profile)
    }

    override fun deleteApplicantFile(
        userId: Long,
        fileId: Long,
    ): ApplicantProfile {
        val profile = loadApplicantProfileDto(userId)

        val attachment = mediaServiceClient.getAttachments(
            entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
            entityId = userId,
        ).firstOrNull { currentAttachment ->
            currentAttachment.fileId == fileId && currentAttachment.attachmentRole in applicantDownloadRoles
        } ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Applicant file not found")

        mediaServiceClient.deleteAttachment(attachment.attachmentId)

        return buildApplicantProfile(profileDto = profile)
    }

    override fun patchEmployerProfile(
        userId: Long,
        request: EmployerProfilePatchRequest,
    ): EmployerProfile {
        val profile = loadEmployerProfileDto(userId)

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
        request.locationId?.let {
            profile.location = locationDao.findById(it)
                .orElseThrow { EntityNotFoundException("Unknown location") }
        }

        val savedProfile = employerProfileDao.save(profile)
        return buildEmployerProfile(savedProfile)
    }

    override fun putEmployerLogo(
        userId: Long,
        file: MultipartFile,
    ): EmployerProfile {
        val profile = loadEmployerProfileDto(userId)

        val logo = replaceSingleAttachment(
            userId = userId,
            file = file,
            kind = FileAssetKind.LOGO,
            entityType = FileAttachmentEntityType.EMPLOYER_PROFILE,
            attachmentRole = FileAttachmentRole.LOGO,
            visibility = FileAssetVisibility.PUBLIC,
            previousAttachmentIds = getEmployerAttachmentIds(userId, FileAttachmentRole.LOGO),
            logSubject = "employer logo",
        )

        return buildEmployerProfile(
            profileDto = profile,
            logo = logo,
        )
    }

    override fun deleteEmployerFile(
        userId: Long,
        fileId: Long,
    ): EmployerProfile {
        val profile = loadEmployerProfileDto(userId)

        val attachment = mediaServiceClient.getAttachments(
            entityType = FileAttachmentEntityType.EMPLOYER_PROFILE,
            entityId = userId,
        ).firstOrNull { currentAttachment ->
            currentAttachment.fileId == fileId && currentAttachment.attachmentRole in employerDownloadRoles
        } ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Employer file not found")

        mediaServiceClient.deleteAttachment(attachment.attachmentId)

        return buildEmployerProfile(profileDto = profile)
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
        val profileDto = loadEmployerProfileDto(targetUserId)

        if (targetUserId == currentUserId) {
            return buildEmployerProfile(profileDto)
        }

        return buildEmployerProfile(profileDto)
    }

    override fun getApplicantFileDownloadUrl(
        currentUserId: Long?,
        targetUserId: Long,
        fileId: Long,
    ): InternalFileDownloadUrlResponse {
        val profileDto = loadApplicantProfileDto(targetUserId)
        val attachments = mediaServiceClient.getAttachments(
            entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
            entityId = targetUserId,
        )

        val requestedAttachment = attachments.firstOrNull { attachment ->
            attachment.fileId == fileId && attachment.attachmentRole in applicantDownloadRoles
        } ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Applicant file not found")

        if (!canAccessApplicantAttachment(currentUserId, targetUserId, profileDto, requestedAttachment)) {
            throw AccessDeniedException("You do not have access to this file")
        }

        return mediaServiceClient.getDownloadUrl(requestedAttachment.fileId)
    }

    override fun getEmployerFileDownloadUrl(
        currentUserId: Long?,
        targetUserId: Long,
        fileId: Long,
    ): InternalFileDownloadUrlResponse {
        loadEmployerProfileDto(targetUserId)

        val attachments = mediaServiceClient.getAttachments(
            entityType = FileAttachmentEntityType.EMPLOYER_PROFILE,
            entityId = targetUserId,
        )

        val requestedAttachment = attachments.firstOrNull { attachment ->
            attachment.fileId == fileId && attachment.attachmentRole in employerDownloadRoles
        } ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Employer file not found")

        return mediaServiceClient.getDownloadUrl(requestedAttachment.fileId)
    }

    private fun loadApplicantProfileDto(userId: Long): ApplicantProfileDto {
        return applicantProfileDao.findById(userId)
            .orElseThrow { EntityNotFoundException("Applicant profile for user $userId not found") }
    }

    private fun loadEmployerProfileDto(userId: Long): EmployerProfileDto {
        return employerProfileDao.findById(userId)
            .orElseThrow { EntityNotFoundException("Employer profile for user $userId not found") }
    }

    private fun buildApplicantProfile(
        profileDto: ApplicantProfileDto,
        avatar: InternalFileMetadataResponse? = loadApplicantSingleFileOrNull(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.AVATAR,
            visibility = profileDto.profileVisibility.toFileVisibility(),
            logSubject = "applicant avatar",
        ),
        resumeFile: InternalFileMetadataResponse? = loadApplicantSingleFileOrNull(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.RESUME,
            visibility = profileDto.resumeVisibility.toFileVisibility(),
            logSubject = "applicant resume",
        ),
        portfolioFiles: List<InternalFileMetadataResponse> = loadApplicantPortfolioFiles(profileDto),
        applicantTags: ApplicantTagsView = loadApplicantTags(profileDto.userId),
    ): ApplicantProfile {
        return applicantProfileConverter.fromDto(profileDto).copy(
            avatar = avatar,
            resumeFile = resumeFile,
            portfolioFiles = portfolioFiles,
            skills = applicantTags.skills,
            interests = applicantTags.interests,
        )
    }

    private fun buildEmployerProfile(
        profileDto: EmployerProfileDto,
        logo: InternalFileMetadataResponse? = loadEmployerSingleFileOrNull(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.LOGO,
            visibility = FileAssetVisibility.PUBLIC,
            logSubject = "employer logo",
        ),
    ): EmployerProfile {
        return employerProfileConverter.fromDto(profileDto).copy(
            logo = logo,
        )
    }

    private fun loadApplicantTags(
        applicantUserId: Long,
    ): ApplicantTagsView {
        val relations = applicantTagDao.findAllByApplicantUserId(applicantUserId)
        if (relations.isEmpty()) {
            return ApplicantTagsView()
        }

        return try {
            val tagsById = opportunityTagClient.getActiveTagsByIds(
                relations.map { it.tagId }.distinct(),
            ).associateBy { it.id }

            val skills = relations.asSequence()
                .filter { it.relationType == ApplicantTagRelationType.SKILL }
                .mapNotNull { tagsById[it.tagId] }
                .sortedBy { it.name.lowercase() }
                .toList()

            val interests = relations.asSequence()
                .filter { it.relationType == ApplicantTagRelationType.INTEREST }
                .mapNotNull { tagsById[it.tagId] }
                .sortedBy { it.name.lowercase() }
                .toList()

            ApplicantTagsView(
                skills = skills,
                interests = interests,
            )
        } catch (ex: Exception) {
            logger.warn("Failed to load applicant tags for user {}", applicantUserId, ex)
            ApplicantTagsView()
        }
    }

    private fun requireActiveTagsByIds(
        tagIds: Set<Long>,
    ): List<Tag> {
        if (tagIds.isEmpty()) {
            return emptyList()
        }

        return try {
            opportunityTagClient.getActiveTagsByIds(tagIds.toList())
        } catch (ex: Exception) {
            logger.warn("Failed to validate applicant tags: {}", tagIds, ex)
            throw ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Failed to validate applicant tags",
            )
        }
    }

    private fun replaceApplicantTags(
        applicantUserId: Long,
        relationType: ApplicantTagRelationType,
        tagIds: List<Long>,
        activeTagsById: Map<Long, Tag>,
    ) {
        val normalizedTagIds = tagIds.distinct()

        val invalidTagIds = normalizedTagIds.filterNot { activeTagsById.containsKey(it) }
        if (invalidTagIds.isNotEmpty()) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Unknown, inactive or unapproved ${relationType.name.lowercase()} tags: $invalidTagIds",
            )
        }

        applicantTagDao.deleteAllByApplicantUserIdAndRelationType(
            applicantUserId = applicantUserId,
            relationType = relationType,
        )

        if (normalizedTagIds.isEmpty()) {
            return
        }

        applicantTagDao.saveAll(
            normalizedTagIds.map { tagId ->
                ApplicantTagDto(
                    applicantUserId = applicantUserId,
                    tagId = tagId,
                    relationType = relationType,
                )
            },
        )
    }

    private fun loadApplicantPortfolioFiles(
        profileDto: ApplicantProfileDto,
    ): List<InternalFileMetadataResponse> {
        return loadApplicantAttachments(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.PORTFOLIO,
            visibility = profileDto.resumeVisibility.toFileVisibility(),
            logSubject = "applicant portfolio",
        ).map { it.file }
    }

    private fun loadApplicantPortfolioAttachments(
        profileDto: ApplicantProfileDto,
    ): List<InternalFileAttachmentResponse> {
        return loadApplicantAttachments(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.PORTFOLIO,
            visibility = profileDto.resumeVisibility.toFileVisibility(),
            logSubject = "applicant portfolio",
        )
    }

    private fun loadApplicantSingleFileOrNull(
        userId: Long,
        attachmentRole: FileAttachmentRole,
        visibility: FileAssetVisibility,
        logSubject: String,
    ): InternalFileMetadataResponse? {
        return loadApplicantAttachments(
            userId = userId,
            attachmentRole = attachmentRole,
            visibility = visibility,
            logSubject = logSubject,
        ).maxByOrNull { it.attachmentId }
            ?.file
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

    private fun loadApplicantAttachments(
        userId: Long,
        attachmentRole: FileAttachmentRole,
        visibility: FileAssetVisibility,
        logSubject: String,
    ): List<InternalFileAttachmentResponse> {
        return try {
            mediaServiceClient.getAttachments(
                entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
                entityId = userId,
            ).filter { it.attachmentRole == attachmentRole }
                .map { it.withFileVisibility(visibility) }
        } catch (ex: Exception) {
            logger.warn("Failed to load {} for user {}", logSubject, userId, ex)
            emptyList()
        }
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
            logger.warn("Failed to load {} for user {}", logSubject, userId, ex)
            emptyList()
        }
    }

    private fun getApplicantAttachmentIds(
        userId: Long,
        attachmentRole: FileAttachmentRole,
    ): List<Long> {
        return loadApplicantAttachments(
            userId = userId,
            attachmentRole = attachmentRole,
            visibility = FileAssetVisibility.PRIVATE,
            logSubject = "applicant attachment ids",
        ).map { it.attachmentId }
    }

    private fun getEmployerAttachmentIds(
        userId: Long,
        attachmentRole: FileAttachmentRole,
    ): List<Long> {
        return loadEmployerAttachments(
            userId = userId,
            attachmentRole = attachmentRole,
            visibility = FileAssetVisibility.PUBLIC,
            logSubject = "employer attachment ids",
        ).map { it.attachmentId }
    }

    private fun replaceSingleAttachment(
        userId: Long,
        file: MultipartFile,
        kind: FileAssetKind,
        entityType: FileAttachmentEntityType,
        attachmentRole: FileAttachmentRole,
        visibility: FileAssetVisibility,
        previousAttachmentIds: List<Long>,
        logSubject: String,
    ): InternalFileMetadataResponse {
        val createdFile = mediaServiceClient.uploadFile(
            file = file,
            ownerUserId = userId,
            kind = kind,
            visibility = visibility,
        )

        val createdAttachment = mediaServiceClient.createAttachment(
            InternalCreateFileAttachmentRequest(
                fileId = createdFile.fileId,
                entityType = entityType,
                entityId = userId,
                attachmentRole = attachmentRole,
            ),
        )

        deleteAttachments(
            attachmentIds = previousAttachmentIds,
            userId = userId,
            logSubject = logSubject,
        )

        return createdAttachment.file.toProfileFileMetadata(visibility)
    }

    private fun deleteAttachments(
        attachmentIds: List<Long>,
        userId: Long,
        logSubject: String,
    ) {
        attachmentIds.forEach { attachmentId ->
            try {
                mediaServiceClient.deleteAttachment(attachmentId)
            } catch (ex: Exception) {
                logger.warn(
                    "Failed to delete previous {} attachment {} for user {}",
                    logSubject,
                    attachmentId,
                    userId,
                    ex,
                )
            }
        }
    }

    private fun canAccessApplicantAttachment(
        currentUserId: Long?,
        targetUserId: Long,
        profileDto: ApplicantProfileDto,
        attachment: InternalFileAttachmentResponse,
    ): Boolean {
        if (currentUserId == targetUserId) {
            return true
        }

        return when (attachment.attachmentRole) {
            FileAttachmentRole.AVATAR -> canAccessProfileVisibility(
                visibility = profileDto.profileVisibility,
                currentUserId = currentUserId,
            )

            FileAttachmentRole.RESUME,
            FileAttachmentRole.PORTFOLIO -> canAccessResumeVisibility(
                visibility = profileDto.resumeVisibility,
                currentUserId = currentUserId,
            )

            else -> false
        }
    }

    private fun canAccessProfileVisibility(
        visibility: ProfileVisibility,
        currentUserId: Long?,
    ): Boolean {
        return when (visibility) {
            ProfileVisibility.PUBLIC -> true
            ProfileVisibility.AUTHENTICATED -> currentUserId != null
            ProfileVisibility.PRIVATE -> false
        }
    }

    private fun canAccessResumeVisibility(
        visibility: ResumeVisibility,
        currentUserId: Long?,
    ): Boolean {
        return when (visibility) {
            ResumeVisibility.PUBLIC -> true
            ResumeVisibility.AUTHENTICATED -> currentUserId != null
            ResumeVisibility.PRIVATE -> false
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

    private fun ProfileVisibility.toFileVisibility(): FileAssetVisibility {
        return when (this) {
            ProfileVisibility.PUBLIC -> FileAssetVisibility.PUBLIC
            ProfileVisibility.AUTHENTICATED -> FileAssetVisibility.AUTHENTICATED
            ProfileVisibility.PRIVATE -> FileAssetVisibility.PRIVATE
        }
    }

    private fun ResumeVisibility.toFileVisibility(): FileAssetVisibility {
        return when (this) {
            ResumeVisibility.PUBLIC -> FileAssetVisibility.PUBLIC
            ResumeVisibility.AUTHENTICATED -> FileAssetVisibility.AUTHENTICATED
            ResumeVisibility.PRIVATE -> FileAssetVisibility.PRIVATE
        }
    }

    private data class ApplicantTagsView(
        val skills: List<Tag> = emptyList(),
        val interests: List<Tag> = emptyList(),
    )

    private companion object {
        private val logger = LoggerFactory.getLogger(ProfileServiceImpl::class.java)

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
