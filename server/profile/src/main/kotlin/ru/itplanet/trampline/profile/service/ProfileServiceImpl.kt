package ru.itplanet.trampline.profile.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.exception.ApiException
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.file.InternalFileDownloadUrlResponse
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.commons.model.profile.ApplicantProfileModerationStatus
import ru.itplanet.trampline.commons.model.profile.EmployerProfileModerationStatus
import ru.itplanet.trampline.profile.client.InteractionPrivacyClient
import ru.itplanet.trampline.profile.client.MediaServiceClient
import ru.itplanet.trampline.profile.client.ModerationServiceClient
import ru.itplanet.trampline.profile.client.OpportunityTagClient
import ru.itplanet.trampline.profile.converter.ApplicantProfileConverter
import ru.itplanet.trampline.profile.converter.EmployerProfileConverter
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.dao.ApplicantTagDao
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
import ru.itplanet.trampline.profile.dao.dto.ApplicantTagDto
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.exception.ProfileBadRequestException
import ru.itplanet.trampline.profile.exception.ProfileConflictException
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.exception.ProfileIntegrationException
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.ApplicantApplicationSummary
import ru.itplanet.trampline.profile.model.ApplicantContactSummary
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.ApplicantProfileSearchItem
import ru.itplanet.trampline.profile.model.ApplicantProfileSearchPage
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.enums.ApplicantTagRelationType
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerCompanyPatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.GetApplicantProfileListRequest
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility

@Primary
@Service
class ProfileServiceImpl(
    private val applicantProfileDao: ApplicantProfileDao,
    private val applicantTagDao: ApplicantTagDao,
    private val employerProfileDao: EmployerProfileDao,
    private val applicantProfileConverter: ApplicantProfileConverter,
    private val employerProfileConverter: EmployerProfileConverter,
    private val mediaServiceClient: MediaServiceClient,
    private val opportunityTagClient: OpportunityTagClient,
    private val moderationServiceClient: ModerationServiceClient,
    private val interactionPrivacyClient: InteractionPrivacyClient,
    private val applicantProfileVisibilityService: ApplicantProfileVisibilityService,
    private val objectMapper: ObjectMapper,
    private val employerProfilePatchService: EmployerProfileDomainPatchService,
    private val applicantProfileDomainPatchService: ApplicantProfileDomainPatchService,
) : ProfileService {

    @Transactional
    override fun patchApplicantProfile(
        userId: Long,
        request: ApplicantProfilePatchRequest,
    ): ApplicantProfile {
        return applicantProfileDomainPatchService.applyPatch(userId, request)
    }

    @Transactional
    override fun submitApplicantProfileForModeration(
        userId: Long,
    ): ApplicantProfile {
        val profile = loadApplicantProfileDto(userId)

        when (profile.moderationStatus) {
            ApplicantProfileModerationStatus.PENDING_MODERATION -> {
                throw ProfileConflictException(
                    message = "Профиль уже находится на модерации",
                    code = "applicant_profile_already_on_moderation",
                )
            }

            ApplicantProfileModerationStatus.APPROVED -> {
                throw ProfileConflictException(
                    message = "Профиль уже одобрен. После изменений он будет повторно отправлен на модерацию из статуса DRAFT",
                    code = "applicant_profile_already_approved",
                )
            }

            ApplicantProfileModerationStatus.DRAFT,
            ApplicantProfileModerationStatus.NEEDS_REVISION -> Unit
        }

        val profileView = buildApplicantProfile(profile)
        validateApplicantProfileCanBeSubmitted(profileView)

        runModerationAction(
            logMessage = "Не удалось создать задачу модерации профиля соискателя userId=$userId",
            errorMessage = "Не удалось отправить профиль соискателя на модерацию",
            code = "applicant_profile_task_create_failed",
        ) {
            moderationServiceClient.createTask(
                CreateInternalModerationTaskRequest(
                    entityType = ModerationEntityType.APPLICANT_PROFILE,
                    entityId = userId,
                    taskType = ModerationTaskType.PROFILE_REVIEW,
                    priority = ModerationTaskPriority.MEDIUM,
                    createdByUserId = userId,
                    snapshot = objectMapper.valueToTree(
                        profileView.copy(
                            moderationStatus = ApplicantProfileModerationStatus.PENDING_MODERATION,
                        ),
                    ),
                    sourceService = "profile",
                    sourceAction = "submitApplicantProfileForModeration",
                ),
            )
        }

        profile.moderationStatus = ApplicantProfileModerationStatus.PENDING_MODERATION
        val saved = applicantProfileDao.save(profile)
        return buildApplicantProfile(saved)
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
            logSubject = "аватар соискателя",
        )

        handleApplicantProfileContentChanged(profile)
        val savedProfile = applicantProfileDao.save(profile)

        return buildApplicantProfile(
            profileDto = savedProfile,
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
            logSubject = "резюме соискателя",
        )

        handleApplicantProfileContentChanged(profile)
        val savedProfile = applicantProfileDao.save(profile)

        return buildApplicantProfile(
            profileDto = savedProfile,
            resumeFile = resumeFile,
        )
    }

    override fun addApplicantPortfolioFile(
        userId: Long,
        file: MultipartFile,
    ): List<InternalFileAttachmentResponse> {
        val profile = loadApplicantProfileDto(userId)
        val visibility = profile.resumeVisibility.toFileVisibility()

        val createdFile = runMediaAction(
            logMessage = "Не удалось загрузить файл портфолио соискателя userId=$userId",
            errorMessage = "Не удалось загрузить файл портфолио",
            code = "applicant_portfolio_upload_failed",
        ) {
            mediaServiceClient.uploadFile(
                file = file,
                ownerUserId = userId,
                kind = FileAssetKind.PORTFOLIO,
                visibility = visibility,
            )
        }

        runMediaAction(
            logMessage = "Не удалось создать вложение портфолио соискателя userId=$userId",
            errorMessage = "Не удалось привязать файл портфолио к профилю",
            code = "applicant_portfolio_attachment_create_failed",
        ) {
            mediaServiceClient.createAttachment(
                InternalCreateFileAttachmentRequest(
                    fileId = createdFile.fileId,
                    entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
                    entityId = userId,
                    attachmentRole = FileAttachmentRole.PORTFOLIO,
                ),
            )
        }

        handleApplicantProfileContentChanged(profile)
        applicantProfileDao.save(profile)

        return loadApplicantPortfolioAttachments(profile)
    }

    override fun deleteApplicantFile(
        userId: Long,
        fileId: Long,
    ): ApplicantProfile {
        val profile = loadApplicantProfileDto(userId)

        val attachments = runMediaAction(
            logMessage = "Не удалось получить список файлов соискателя userId=$userId",
            errorMessage = "Не удалось получить файлы профиля соискателя",
            code = "applicant_files_load_failed",
        ) {
            mediaServiceClient.getAttachments(
                entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
                entityId = userId,
            )
        }

        val attachment = attachments.firstOrNull { currentAttachment ->
            currentAttachment.fileId == fileId && currentAttachment.attachmentRole in applicantDownloadRoles
        } ?: throw ProfileNotFoundException(
            message = "Файл соискателя не найден",
            code = "applicant_file_not_found",
        )

        runMediaAction(
            logMessage = "Не удалось удалить файл соискателя fileId=$fileId, userId=$userId",
            errorMessage = "Не удалось удалить файл соискателя",
            code = "applicant_file_delete_failed",
        ) {
            mediaServiceClient.deleteAttachment(attachment.attachmentId)
        }

        handleApplicantProfileContentChanged(profile)
        val savedProfile = applicantProfileDao.save(profile)

        return buildApplicantProfile(profileDto = savedProfile)
    }

    override fun patchEmployerProfile(
        userId: Long,
        request: EmployerProfilePatchRequest,
    ): EmployerProfile {
        return employerProfilePatchService.applyPatch(userId, request)
    }

    override fun patchEmployerCompany(
        userId: Long,
        request: EmployerCompanyPatchRequest,
    ): EmployerProfile {
        return employerProfilePatchService.applyCompanyPatch(userId, request)
    }

    @Transactional
    override fun submitEmployerProfileForModeration(
        userId: Long,
    ): EmployerProfile {
        val profile = loadEmployerProfileDto(userId)

        if (hasApprovedEmployerSnapshot(profile)) {
            throw ProfileConflictException(
                message = "После первого одобрения новые изменения профиля компании отправляются на модерацию автоматически при сохранении",
                code = "employer_profile_auto_moderation_enabled",
            )
        }

        when (profile.moderationStatus) {
            EmployerProfileModerationStatus.PENDING_MODERATION -> {
                throw ProfileConflictException(
                    message = "Профиль компании уже находится на модерации",
                    code = "employer_profile_already_on_moderation",
                )
            }

            EmployerProfileModerationStatus.APPROVED -> {
                throw ProfileConflictException(
                    message = "Профиль компании уже одобрен",
                    code = "employer_profile_already_approved",
                )
            }

            EmployerProfileModerationStatus.DRAFT,
            EmployerProfileModerationStatus.NEEDS_REVISION -> Unit
        }

        val profileView = buildEmployerProfile(profile)
        validateEmployerProfileCanBeSubmitted(profileView)

        runModerationAction(
            logMessage = "Не удалось создать задачу модерации профиля работодателя userId=$userId",
            errorMessage = "Не удалось отправить профиль компании на модерацию",
            code = "employer_profile_task_create_failed",
        ) {
            moderationServiceClient.createTask(
                CreateInternalModerationTaskRequest(
                    entityType = ModerationEntityType.EMPLOYER_PROFILE,
                    entityId = userId,
                    taskType = ModerationTaskType.PROFILE_REVIEW,
                    priority = ModerationTaskPriority.MEDIUM,
                    createdByUserId = userId,
                    snapshot = objectMapper.valueToTree(
                        profileView.copy(
                            moderationStatus = EmployerProfileModerationStatus.PENDING_MODERATION,
                        ),
                    ),
                    sourceService = "profile",
                    sourceAction = "submitEmployerProfileForModeration",
                ),
            )
        }

        profile.moderationStatus = EmployerProfileModerationStatus.PENDING_MODERATION
        val saved = employerProfileDao.save(profile)
        return buildEmployerProfile(saved)
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
            logSubject = "логотип работодателя",
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

        val attachments = runMediaAction(
            logMessage = "Не удалось получить список файлов работодателя userId=$userId",
            errorMessage = "Не удалось получить файлы профиля работодателя",
            code = "employer_files_load_failed",
        ) {
            mediaServiceClient.getAttachments(
                entityType = FileAttachmentEntityType.EMPLOYER_PROFILE,
                entityId = userId,
            )
        }

        val attachment = attachments.firstOrNull { currentAttachment ->
            currentAttachment.fileId == fileId && currentAttachment.attachmentRole in employerDownloadRoles
        } ?: throw ProfileNotFoundException(
            message = "Файл работодателя не найден",
            code = "employer_file_not_found",
        )

        runMediaAction(
            logMessage = "Не удалось удалить файл работодателя fileId=$fileId, userId=$userId",
            errorMessage = "Не удалось удалить файл работодателя",
            code = "employer_file_delete_failed",
        ) {
            mediaServiceClient.deleteAttachment(attachment.attachmentId)
        }

        return buildEmployerProfile(profileDto = profile)
    }

    @Transactional(readOnly = true)
    override fun searchApplicants(
        currentUserId: Long,
        request: GetApplicantProfileListRequest,
    ): ApplicantProfileSearchPage {
        val normalizedSearch = request.search
            ?.trim()
            ?.takeIf { it.isNotEmpty() }

        val skillTagIds = request.skillTagIds.distinct()
        val interestTagIds = request.interestTagIds.distinct()

        val preparedSkillTagIds = skillTagIds.ifEmpty { listOf(NO_TAG_ID_PLACEHOLDER) }
        val preparedInterestTagIds = interestTagIds.ifEmpty { listOf(NO_TAG_ID_PLACEHOLDER) }

        val total = applicantProfileDao.countApplicantUserIds(
            currentUserId = currentUserId,
            search = normalizedSearch,
            cityId = request.cityId,
            openToWork = request.openToWork,
            openToEvents = request.openToEvents,
            skillTagIds = preparedSkillTagIds,
            skillTagIdsEmpty = skillTagIds.isEmpty(),
            interestTagIds = preparedInterestTagIds,
            interestTagIdsEmpty = interestTagIds.isEmpty(),
        )

        if (total == 0L) {
            return ApplicantProfileSearchPage(
                items = emptyList(),
                limit = request.limit,
                offset = request.offset,
                total = 0,
            )
        }

        val applicantUserIds = applicantProfileDao.searchApplicantUserIds(
            currentUserId = currentUserId,
            search = normalizedSearch,
            cityId = request.cityId,
            openToWork = request.openToWork,
            openToEvents = request.openToEvents,
            skillTagIds = preparedSkillTagIds,
            skillTagIdsEmpty = skillTagIds.isEmpty(),
            interestTagIds = preparedInterestTagIds,
            interestTagIdsEmpty = interestTagIds.isEmpty(),
            limit = request.limit,
            offset = request.offset,
        )

        if (applicantUserIds.isEmpty()) {
            return ApplicantProfileSearchPage(
                items = emptyList(),
                limit = request.limit,
                offset = request.offset,
                total = total,
            )
        }

        val profilesById = applicantProfileDao.findAllById(applicantUserIds)
            .associateBy { it.userId }

        val items = applicantUserIds.mapNotNull { applicantUserId ->
            profilesById[applicantUserId]?.let(::buildApplicantProfileSearchItem)
        }

        return ApplicantProfileSearchPage(
            items = items,
            limit = request.limit,
            offset = request.offset,
            total = total,
        )
    }

    override fun getApplicantProfile(
        currentUserId: Long?,
        targetUserId: Long,
    ): ApplicantProfile {
        val profileDto = loadApplicantProfileDto(targetUserId)
        val fullProfile = buildApplicantProfile(profileDto)

        val owner = currentUserId == targetUserId
        val employerAccess = hasEmployerAccessToApplicantProfile(currentUserId, targetUserId)

        if (
            !owner &&
            profileDto.moderationStatus != ApplicantProfileModerationStatus.APPROVED &&
            !employerAccess
        ) {
            throw ProfileForbiddenException(
                message = "Профиль соискателя ещё не доступен другим пользователям",
                code = "applicant_profile_not_moderated",
            )
        }

        if (owner || employerAccess) {
            return fullProfile
        }

        return applicantProfileVisibilityService.sanitizeApplicantProfile(
            profile = fullProfile,
            currentUserId = currentUserId,
        )
    }

    override fun getApplicantContacts(
        currentUserId: Long?,
        targetUserId: Long,
    ): List<ApplicantContactSummary> {
        val profileDto = loadApplicantProfileDto(targetUserId)

        if (currentUserId != targetUserId && profileDto.moderationStatus != ApplicantProfileModerationStatus.APPROVED) {
            throw ProfileForbiddenException(
                message = "Раздел контактов этого профиля пока недоступен",
                code = "applicant_contacts_access_denied",
            )
        }

        if (
            !applicantProfileVisibilityService.canViewApplicantContacts(
                visibility = profileDto.contactsVisibility,
                currentUserId = currentUserId,
                targetUserId = targetUserId,
            )
        ) {
            throw ProfileForbiddenException(
                message = "Раздел контактов этого профиля закрыт",
                code = "applicant_contacts_access_denied",
            )
        }

        return interactionPrivacyClient.getApplicantContacts(targetUserId)
    }

    override fun getApplicantApplications(
        currentUserId: Long?,
        targetUserId: Long,
    ): List<ApplicantApplicationSummary> {
        val profileDto = loadApplicantProfileDto(targetUserId)

        if (currentUserId != targetUserId && profileDto.moderationStatus != ApplicantProfileModerationStatus.APPROVED) {
            throw ProfileForbiddenException(
                message = "Раздел откликов этого профиля пока недоступен",
                code = "applicant_applications_access_denied",
            )
        }

        if (
            !applicantProfileVisibilityService.canViewApplicantApplications(
                visibility = profileDto.applicationsVisibility,
                currentUserId = currentUserId,
                targetUserId = targetUserId,
            )
        ) {
            throw ProfileForbiddenException(
                message = "Раздел откликов этого профиля закрыт",
                code = "applicant_applications_access_denied",
            )
        }

        return interactionPrivacyClient.getApplicantApplications(targetUserId)
    }

    override fun getEmployerProfile(
        currentUserId: Long?,
        targetUserId: Long,
    ): EmployerProfile {
        val profileDto = loadEmployerProfileDto(targetUserId)

        if (currentUserId == targetUserId) {
            return buildEmployerProfile(profileDto)
        }

        return buildPublicEmployerProfile(profileDto)
    }

    override fun getApplicantFileDownloadUrl(
        currentUserId: Long?,
        targetUserId: Long,
        fileId: Long,
    ): InternalFileDownloadUrlResponse {
        val profileDto = loadApplicantProfileDto(targetUserId)
        val attachments = runMediaAction(
            logMessage = "Не удалось получить вложения профиля соискателя userId=$targetUserId",
            errorMessage = "Не удалось получить файл профиля соискателя",
            code = "applicant_file_download_prepare_failed",
        ) {
            mediaServiceClient.getAttachments(
                entityType = FileAttachmentEntityType.APPLICANT_PROFILE,
                entityId = targetUserId,
            )
        }

        val requestedAttachment = attachments.firstOrNull { attachment ->
            attachment.fileId == fileId && attachment.attachmentRole in applicantDownloadRoles
        } ?: throw ProfileNotFoundException(
            message = "Файл соискателя не найден",
            code = "applicant_file_not_found",
        )

        val owner = currentUserId == targetUserId
        val employerAccess = hasEmployerAccessToApplicantProfile(currentUserId, targetUserId)

        if (
            !owner &&
            profileDto.moderationStatus != ApplicantProfileModerationStatus.APPROVED &&
            !employerAccess
        ) {
            throw ProfileForbiddenException(
                message = "У вас нет доступа к этому файлу",
                code = "applicant_file_access_denied",
            )
        }

        if (
            !owner &&
            !employerAccess &&
            !canAccessApplicantAttachment(currentUserId, targetUserId, profileDto, requestedAttachment)
        ) {
            throw ProfileForbiddenException(
                message = "У вас нет доступа к этому файлу",
                code = "applicant_file_access_denied",
            )
        }

        return runMediaAction(
            logMessage = "Не удалось получить ссылку на файл соискателя fileId=$fileId, targetUserId=$targetUserId",
            errorMessage = "Не удалось получить ссылку на файл соискателя",
            code = "applicant_file_download_url_failed",
        ) {
            mediaServiceClient.getDownloadUrl(requestedAttachment.fileId)
        }
    }

    override fun getEmployerFileDownloadUrl(
        currentUserId: Long?,
        targetUserId: Long,
        fileId: Long,
    ): InternalFileDownloadUrlResponse {
        loadEmployerProfileDto(targetUserId)

        val attachments = runMediaAction(
            logMessage = "Не удалось получить вложения профиля работодателя userId=$targetUserId",
            errorMessage = "Не удалось получить файл профиля работодателя",
            code = "employer_file_download_prepare_failed",
        ) {
            mediaServiceClient.getAttachments(
                entityType = FileAttachmentEntityType.EMPLOYER_PROFILE,
                entityId = targetUserId,
            )
        }

        val requestedAttachment = attachments.firstOrNull { attachment ->
            attachment.fileId == fileId && attachment.attachmentRole in employerDownloadRoles
        } ?: throw ProfileNotFoundException(
            message = "Файл работодателя не найден",
            code = "employer_file_not_found",
        )

        return runMediaAction(
            logMessage = "Не удалось получить ссылку на файл работодателя fileId=$fileId, targetUserId=$targetUserId",
            errorMessage = "Не удалось получить ссылку на файл работодателя",
            code = "employer_file_download_url_failed",
        ) {
            mediaServiceClient.getDownloadUrl(requestedAttachment.fileId)
        }
    }

    private fun loadApplicantProfileDto(userId: Long): ApplicantProfileDto {
        return applicantProfileDao.findById(userId)
            .orElseThrow {
                ProfileNotFoundException(
                    message = "Профиль соискателя с идентификатором пользователя $userId не найден",
                    code = "applicant_profile_not_found",
                )
            }
    }

    private fun loadEmployerProfileDto(userId: Long): EmployerProfileDto {
        return employerProfileDao.findById(userId)
            .orElseThrow {
                ProfileNotFoundException(
                    message = "Профиль работодателя с идентификатором пользователя $userId не найден",
                    code = "employer_profile_not_found",
                )
            }
    }

    private fun buildApplicantProfile(
        profileDto: ApplicantProfileDto,
        avatar: InternalFileMetadataResponse? = loadApplicantSingleFileOrNull(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.AVATAR,
            visibility = profileDto.profileVisibility.toFileVisibility(),
            logSubject = "аватар соискателя",
        ),
        resumeFile: InternalFileMetadataResponse? = loadApplicantSingleFileOrNull(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.RESUME,
            visibility = profileDto.resumeVisibility.toFileVisibility(),
            logSubject = "резюме соискателя",
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

    private fun buildApplicantProfileSearchItem(
        profileDto: ApplicantProfileDto,
    ): ApplicantProfileSearchItem {
        val baseProfile = applicantProfileConverter.fromDto(profileDto)

        val avatar = loadApplicantSingleFileOrNull(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.AVATAR,
            visibility = profileDto.profileVisibility.toFileVisibility(),
            logSubject = "аватар соискателя",
        )

        val applicantTags = if (profileDto.resumeVisibility == ResumeVisibility.PRIVATE) {
            ApplicantTagsView()
        } else {
            loadApplicantTags(profileDto.userId)
        }

        return ApplicantProfileSearchItem(
            userId = baseProfile.userId,
            firstName = baseProfile.firstName,
            lastName = baseProfile.lastName,
            middleName = baseProfile.middleName,
            universityName = baseProfile.universityName,
            facultyName = baseProfile.facultyName,
            studyProgram = baseProfile.studyProgram,
            course = baseProfile.course,
            graduationYear = baseProfile.graduationYear,
            city = baseProfile.city,
            about = baseProfile.about,
            avatar = avatar,
            skills = applicantTags.skills,
            interests = applicantTags.interests,
            openToWork = baseProfile.openToWork,
            openToEvents = baseProfile.openToEvents,
        )
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

    private fun buildPublicEmployerProfile(
        profileDto: EmployerProfileDto,
    ): EmployerProfile {
        val logo = loadEmployerSingleFileOrNull(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.LOGO,
            visibility = FileAssetVisibility.PUBLIC,
            logSubject = "логотип работодателя",
        )

        val snapshot = profileDto.approvedPublicSnapshot
        if (snapshot.isObject && snapshot.size() > 0) {
            return try {
                objectMapper.treeToValue(snapshot, EmployerProfile::class.java).copy(
                    verificationStatus = profileDto.verificationStatus,
                    moderationStatus = EmployerProfileModerationStatus.APPROVED,
                    logo = logo,
                )
            } catch (ex: Exception) {
                logger.warn(
                    "Не удалось прочитать approved snapshot профиля работодателя userId={}",
                    profileDto.userId,
                    ex,
                )
                buildPublicEmployerProfileFallback(profileDto, logo)
            }
        }

        return buildPublicEmployerProfileFallback(profileDto, logo)
    }

    private fun buildPublicEmployerProfileFallback(
        profileDto: EmployerProfileDto,
        logo: InternalFileMetadataResponse?,
    ): EmployerProfile {
        if (profileDto.moderationStatus == EmployerProfileModerationStatus.APPROVED) {
            return employerProfileConverter.fromDto(profileDto).copy(
                legalName = null,
                inn = null,
                logo = logo,
            )
        }

        return EmployerProfile(
            userId = profileDto.userId,
            companyName = profileDto.companyName,
            legalName = null,
            inn = null,
            description = null,
            industry = null,
            websiteUrl = null,
            city = null,
            location = null,
            companySize = null,
            foundedYear = null,
            socialLinks = emptyList(),
            publicContacts = emptyList(),
            verificationStatus = profileDto.verificationStatus,
            moderationStatus = profileDto.moderationStatus,
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
            logger.warn("Не удалось загрузить теги соискателя userId={}", applicantUserId, ex)
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
            logger.warn("Не удалось проверить теги соискателя tagIds={}", tagIds, ex)
            throw ProfileIntegrationException(
                message = "Не удалось проверить выбранные теги соискателя",
                code = "applicant_tags_validation_failed",
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
            val relationLabel = when (relationType) {
                ApplicantTagRelationType.SKILL -> "навыки"
                ApplicantTagRelationType.INTEREST -> "интересы"
            }

            throw ProfileBadRequestException(
                message = "Среди выбранных тегов для раздела \"$relationLabel\" есть несуществующие, неактивные или неодобренные: $invalidTagIds",
                code = "applicant_tags_not_available",
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

    private fun validateApplicantProfileCanBeSubmitted(
        profile: ApplicantProfile,
    ) {
        val issues = mutableListOf<String>()

        if (profile.firstName.isNullOrBlank()) {
            issues += "укажите имя"
        }
        if (profile.lastName.isNullOrBlank()) {
            issues += "укажите фамилию"
        }
        if (profile.universityName.isNullOrBlank()) {
            issues += "укажите вуз"
        }
        if (profile.course == null && profile.graduationYear == null) {
            issues += "укажите курс или год выпуска"
        }

        val hasProfessionalSignal =
            !profile.resumeText.isNullOrBlank() ||
                    profile.resumeFile != null ||
                    profile.portfolioLinks.isNotEmpty() ||
                    profile.portfolioFiles.isNotEmpty() ||
                    profile.skills.isNotEmpty()

        if (!hasProfessionalSignal) {
            issues += "добавьте хотя бы один профессиональный сигнал: resumeText, resumeFile, portfolio или skills"
        }

        if (issues.isNotEmpty()) {
            throw ProfileBadRequestException(
                message = "Профиль соискателя пока нельзя отправить на модерацию: ${issues.joinToString("; ")}",
                code = "applicant_profile_moderation_submit_invalid",
            )
        }
    }

    private fun validateEmployerProfileCanBeSubmitted(
        profile: EmployerProfile,
    ) {
        val issues = mutableListOf<String>()

        if (profile.companyName.isNullOrBlank()) {
            issues += "укажите название компании"
        }
        if (profile.description.isNullOrBlank()) {
            issues += "добавьте описание компании"
        }
        if (profile.industry.isNullOrBlank()) {
            issues += "укажите сферу деятельности"
        }
        if (profile.city == null && profile.location == null) {
            issues += "укажите город или локацию компании"
        }

        val hasPublicChannel =
            !profile.websiteUrl.isNullOrBlank() ||
                    profile.socialLinks.isNotEmpty() ||
                    profile.publicContacts.isNotEmpty()

        if (!hasPublicChannel) {
            issues += "добавьте хотя бы один публичный канал связи: websiteUrl, socialLinks или publicContacts"
        }

        if (issues.isNotEmpty()) {
            throw ProfileBadRequestException(
                message = "Профиль компании пока нельзя отправить на модерацию: ${issues.joinToString("; ")}",
                code = "employer_profile_moderation_submit_invalid",
            )
        }
    }

    private fun handleApplicantProfileContentChanged(
        profile: ApplicantProfileDto,
    ) {
        when (profile.moderationStatus) {
            ApplicantProfileModerationStatus.APPROVED -> {
                profile.moderationStatus = ApplicantProfileModerationStatus.DRAFT
            }

            ApplicantProfileModerationStatus.PENDING_MODERATION -> {
                runModerationAction(
                    logMessage = "Не удалось отменить активную модерацию профиля соискателя userId=${profile.userId}",
                    errorMessage = "Не удалось обновить состояние модерации профиля соискателя",
                    code = "applicant_profile_task_cancel_failed",
                ) {
                    val taskLookup = moderationServiceClient.getTaskByEntity(
                        entityType = ModerationEntityType.APPLICANT_PROFILE,
                        entityId = profile.userId,
                        taskType = ModerationTaskType.PROFILE_REVIEW,
                    )

                    val taskId = taskLookup.taskId
                    if (taskLookup.exists && taskId != null) {
                        moderationServiceClient.cancelTask(taskId)
                    }
                }

                profile.moderationStatus = ApplicantProfileModerationStatus.DRAFT
            }

            ApplicantProfileModerationStatus.DRAFT,
            ApplicantProfileModerationStatus.NEEDS_REVISION -> Unit
        }
    }

    private fun hasApprovedEmployerSnapshot(
        profile: EmployerProfileDto,
    ): Boolean {
        return profile.approvedPublicSnapshot.isObject && profile.approvedPublicSnapshot.size() > 0
    }

    private fun hasEmployerAccessToApplicantProfile(
        currentUserId: Long?,
        targetUserId: Long,
    ): Boolean {
        if (currentUserId == null || currentUserId == targetUserId) {
            return false
        }

        return try {
            interactionPrivacyClient.hasEmployerAccessToApplicantProfile(
                employerUserId = currentUserId,
                applicantUserId = targetUserId,
            ).canViewProfile
        } catch (ex: Exception) {
            logger.warn(
                "Не удалось проверить доступ работодателя {} к профилю соискателя {}",
                currentUserId,
                targetUserId,
                ex,
            )
            false
        }
    }

    private fun loadApplicantPortfolioFiles(
        profileDto: ApplicantProfileDto,
    ): List<InternalFileMetadataResponse> {
        return loadApplicantAttachments(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.PORTFOLIO,
            visibility = profileDto.resumeVisibility.toFileVisibility(),
            logSubject = "портфолио соискателя",
        ).map { it.file }
    }

    private fun loadApplicantPortfolioAttachments(
        profileDto: ApplicantProfileDto,
    ): List<InternalFileAttachmentResponse> {
        return loadApplicantAttachments(
            userId = profileDto.userId,
            attachmentRole = FileAttachmentRole.PORTFOLIO,
            visibility = profileDto.resumeVisibility.toFileVisibility(),
            logSubject = "портфолио соискателя",
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
            logger.warn("Не удалось загрузить {} для userId={}", logSubject, userId, ex)
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
            logger.warn("Не удалось загрузить {} для userId={}", logSubject, userId, ex)
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
            logSubject = "идентификаторы вложений соискателя",
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
            logSubject = "идентификаторы вложений работодателя",
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
        val createdFile = runMediaAction(
            logMessage = "Не удалось загрузить $logSubject для userId=$userId",
            errorMessage = "Не удалось загрузить файл профиля",
            code = "profile_file_upload_failed",
        ) {
            mediaServiceClient.uploadFile(
                file = file,
                ownerUserId = userId,
                kind = kind,
                visibility = visibility,
            )
        }

        val createdAttachment = runMediaAction(
            logMessage = "Не удалось создать вложение $logSubject для userId=$userId",
            errorMessage = "Не удалось привязать файл к профилю",
            code = "profile_file_attachment_create_failed",
        ) {
            mediaServiceClient.createAttachment(
                InternalCreateFileAttachmentRequest(
                    fileId = createdFile.fileId,
                    entityType = entityType,
                    entityId = userId,
                    attachmentRole = attachmentRole,
                ),
            )
        }

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
                    "Не удалось удалить старое вложение {} attachmentId={} для userId={}",
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

    private inline fun <T> runMediaAction(
        logMessage: String,
        errorMessage: String,
        code: String,
        block: () -> T,
    ): T {
        return try {
            block()
        } catch (ex: ApiException) {
            throw ex
        } catch (ex: Exception) {
            logger.warn(logMessage, ex)
            throw ProfileIntegrationException(
                message = errorMessage,
                code = code,
            )
        }
    }

    private inline fun <T> runModerationAction(
        logMessage: String,
        errorMessage: String,
        code: String,
        block: () -> T,
    ): T {
        return try {
            block()
        } catch (ex: ApiException) {
            throw ex
        } catch (ex: Exception) {
            logger.warn(logMessage, ex)
            throw ProfileIntegrationException(
                message = errorMessage,
                code = code,
            )
        }
    }

    private data class ApplicantTagsView(
        val skills: List<Tag> = emptyList(),
        val interests: List<Tag> = emptyList(),
    )

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
