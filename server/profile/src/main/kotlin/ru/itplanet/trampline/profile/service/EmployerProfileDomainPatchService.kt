package ru.itplanet.trampline.profile.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.commons.model.profile.EmployerProfileModerationStatus
import ru.itplanet.trampline.profile.client.MediaServiceClient
import ru.itplanet.trampline.profile.client.ModerationServiceClient
import ru.itplanet.trampline.profile.converter.EmployerProfileConverter
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.exception.ProfileBadRequestException
import ru.itplanet.trampline.profile.exception.ProfileIntegrationException
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.request.EmployerCompanyPatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest
import ru.itplanet.trampline.profile.validation.EmployerProfileDomainValidator

@Service
class EmployerProfileDomainPatchService(
    private val employerProfileDao: EmployerProfileDao,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val mediaServiceClient: MediaServiceClient,
    private val employerProfileConverter: EmployerProfileConverter,
    private val validator: EmployerProfileDomainValidator,
    private val moderationServiceClient: ModerationServiceClient,
    private val objectMapper: ObjectMapper,
) {

    @Transactional
    fun applyPatch(profileId: Long, request: EmployerProfilePatchRequest): EmployerProfile {
        val profile = employerProfileDao.findById(profileId)
            .orElseThrow {
                ProfileNotFoundException("Профиль не найден", "profile_not_found")
            }

        if (request.legalName != null || request.inn != null) {
            throw ProfileBadRequestException(
                message = "Название юрлица и ИНН нужно редактировать в отдельном разделе данных компании",
                code = "employer_company_data_patch_separate_required",
            )
        }

        applyChanges(profile, request)
        validator.validate(profile)
        handleEmployerPublicProfileContentChanged(profile)

        val saved = employerProfileDao.save(profile)
        return buildEmployerProfile(saved)
    }

    @Transactional
    fun applyCompanyPatch(profileId: Long, request: EmployerCompanyPatchRequest): EmployerProfile {
        val profile = employerProfileDao.findById(profileId)
            .orElseThrow {
                ProfileNotFoundException("Профиль не найден", "profile_not_found")
            }

        applyCompanyChanges(profile, request)
        validator.validate(profile)
        handleEmployerCompanyContentChanged(profile)

        val saved = employerProfileDao.save(profile)
        return buildEmployerProfile(saved)
    }

    private fun applyChanges(profile: EmployerProfileDto, request: EmployerProfilePatchRequest) {
        request.companyName?.let { profile.companyName = it }
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

    private fun applyCompanyChanges(profile: EmployerProfileDto, request: EmployerCompanyPatchRequest) {
        request.legalName?.let { profile.legalName = it }
        request.inn?.let { profile.inn = it }
    }

    private fun handleEmployerPublicProfileContentChanged(profile: EmployerProfileDto) {
        if (hasApprovedPublicSnapshot(profile)) {
            recreateModerationTask(
                profile = profile,
                taskType = ModerationTaskType.PROFILE_REVIEW,
                snapshot = objectMapper.valueToTree(
                    buildEmployerProfile(profile).copy(
                        moderationStatus = EmployerProfileModerationStatus.PENDING_MODERATION,
                    ),
                ),
                sourceAction = "patchEmployerProfileAutoSubmit",
            )
            profile.moderationStatus = EmployerProfileModerationStatus.PENDING_MODERATION
            return
        }

        if (profile.moderationStatus == EmployerProfileModerationStatus.PENDING_MODERATION) {
            cancelActiveTask(profile.userId, ModerationTaskType.PROFILE_REVIEW)
            profile.moderationStatus = EmployerProfileModerationStatus.DRAFT
        }
    }

    private fun handleEmployerCompanyContentChanged(profile: EmployerProfileDto) {
        if (hasApprovedCompanySnapshot(profile)) {
            recreateModerationTask(
                profile = profile,
                taskType = ModerationTaskType.COMPANY_REVIEW,
                snapshot = objectMapper.valueToTree(
                    mapOf(
                        "legalName" to profile.legalName,
                        "inn" to profile.inn,
                        "companyModerationStatus" to EmployerProfileModerationStatus.PENDING_MODERATION.name,
                    ),
                ),
                sourceAction = "patchEmployerCompanyAutoSubmit",
            )
            profile.companyModerationStatus = EmployerProfileModerationStatus.PENDING_MODERATION
            return
        }

        if (profile.companyModerationStatus == EmployerProfileModerationStatus.PENDING_MODERATION) {
            cancelActiveTask(profile.userId, ModerationTaskType.COMPANY_REVIEW)
            profile.companyModerationStatus = EmployerProfileModerationStatus.DRAFT
        }
    }

    private fun hasApprovedPublicSnapshot(profile: EmployerProfileDto): Boolean {
        return profile.approvedPublicSnapshot.isObject && profile.approvedPublicSnapshot.size() > 0
    }

    private fun hasApprovedCompanySnapshot(profile: EmployerProfileDto): Boolean {
        return profile.approvedCompanySnapshot.isObject && profile.approvedCompanySnapshot.size() > 0
    }

    private fun recreateModerationTask(
        profile: EmployerProfileDto,
        taskType: ModerationTaskType,
        snapshot: JsonNode,
        sourceAction: String,
    ) {
        cancelActiveTask(profile.userId, taskType)

        try {
            moderationServiceClient.createTask(
                CreateInternalModerationTaskRequest(
                    entityType = ModerationEntityType.EMPLOYER_PROFILE,
                    entityId = profile.userId,
                    taskType = taskType,
                    priority = ModerationTaskPriority.MEDIUM,
                    createdByUserId = profile.userId,
                    snapshot = snapshot,
                    sourceService = "profile",
                    sourceAction = sourceAction,
                ),
            )
        } catch (ex: Exception) {
            logger.warn(
                "Не удалось создать employer moderation task userId={}, taskType={}",
                profile.userId,
                taskType,
                ex,
            )
            throw ProfileIntegrationException(
                message = "Не удалось обновить задачу модерации профиля работодателя",
                code = "employer_profile_task_create_failed",
            )
        }
    }

    private fun cancelActiveTask(
        userId: Long,
        taskType: ModerationTaskType,
    ) {
        try {
            val taskLookup = moderationServiceClient.getTaskByEntity(
                entityType = ModerationEntityType.EMPLOYER_PROFILE,
                entityId = userId,
                taskType = taskType,
            )

            val taskId = taskLookup.taskId
            if (taskLookup.exists && taskId != null) {
                moderationServiceClient.cancelTask(taskId)
            }
        } catch (ex: Exception) {
            logger.warn(
                "Не удалось отменить активную employer moderation task userId={}, taskType={}",
                userId,
                taskType,
                ex,
            )
            throw ProfileIntegrationException(
                message = "Не удалось обновить состояние модерации профиля работодателя",
                code = "employer_profile_task_cancel_failed",
            )
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
        private val logger = LoggerFactory.getLogger(EmployerProfileDomainPatchService::class.java)
    }
}
