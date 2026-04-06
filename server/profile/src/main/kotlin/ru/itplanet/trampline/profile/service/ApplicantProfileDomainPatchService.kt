package ru.itplanet.trampline.profile.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.exception.ApiException
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.file.*
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.commons.model.profile.ApplicantProfileModerationStatus
import ru.itplanet.trampline.profile.client.MediaServiceClient
import ru.itplanet.trampline.profile.client.ModerationServiceClient
import ru.itplanet.trampline.profile.client.OpportunityTagClient
import ru.itplanet.trampline.profile.converter.ApplicantProfileConverter
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.dao.ApplicantTagDao
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
import ru.itplanet.trampline.profile.dao.dto.ApplicantTagDto
import ru.itplanet.trampline.profile.exception.ProfileBadRequestException
import ru.itplanet.trampline.profile.exception.ProfileIntegrationException
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.enums.ApplicantTagRelationType
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.validation.ApplicantProfileDomainValidator

@Service
class ApplicantProfileDomainPatchService(
    private val applicantProfileDao: ApplicantProfileDao,
    private val applicantProfileConverter: ApplicantProfileConverter,
    private val cityDao: CityDao,
    private val applicantTagDao: ApplicantTagDao,
    private val moderationServiceClient: ModerationServiceClient,
    private val mediaServiceClient: MediaServiceClient,
    private val opportunityTagClient: OpportunityTagClient,
    private val validator: ApplicantProfileDomainValidator
) {

    @Transactional
    fun applyPatch(userId: Long, request: ApplicantProfilePatchRequest): ApplicantProfile {
        val profile = loadApplicantProfileDto(userId)

        applyChanges(profile, request)

        validator.validate(profile)

        processTags(userId, request)

        handleApplicantProfileContentChanged(profile)

        val saved = applicantProfileDao.save(profile)
        return buildApplicantProfile(saved)
    }

    private fun applyChanges(profile: ApplicantProfileDto, request: ApplicantProfilePatchRequest) {
        request.firstName?.let { profile.firstName = it }
        request.lastName?.let { profile.lastName = it }
        request.middleName?.let { profile.middleName = it }
        request.universityName?.let { profile.universityName = it }
        request.facultyName?.let { profile.facultyName = it }
        request.studyProgram?.let { profile.studyProgram = it }
        request.course?.let { profile.course = it }
        request.graduationYear?.let { profile.graduationYear = it }
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

        request.cityId?.let { cityId ->
            profile.city = cityDao.findById(cityId).orElseThrow {
                ProfileNotFoundException(
                    message = "Город с идентификатором $cityId не найден",
                    code = "city_not_found"
                )
            }
        }
    }

    private fun processTags(userId: Long, request: ApplicantProfilePatchRequest) {
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

    // Эти методы должны быть реализованы или перенесены из исходного сервиса
    private fun loadApplicantProfileDto(userId: Long): ApplicantProfileDto {
        return applicantProfileDao.findById(userId)
            .orElseThrow { ProfileNotFoundException("Профиль соискателя не найден", "profile_not_found") }
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

    private fun ProfileVisibility.toFileVisibility(): FileAssetVisibility {
        return when (this) {
            ProfileVisibility.PUBLIC -> FileAssetVisibility.PUBLIC
            ProfileVisibility.AUTHENTICATED -> FileAssetVisibility.AUTHENTICATED
            ProfileVisibility.PRIVATE -> FileAssetVisibility.PRIVATE
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

    private fun ResumeVisibility.toFileVisibility(): FileAssetVisibility {
        return when (this) {
            ResumeVisibility.PUBLIC -> FileAssetVisibility.PUBLIC
            ResumeVisibility.AUTHENTICATED -> FileAssetVisibility.AUTHENTICATED
            ResumeVisibility.PRIVATE -> FileAssetVisibility.PRIVATE
        }
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