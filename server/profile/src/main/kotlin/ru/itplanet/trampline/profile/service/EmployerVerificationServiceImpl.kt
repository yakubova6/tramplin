package ru.itplanet.trampline.profile.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.exception.ApiException
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskPriority
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.profile.client.MediaServiceClient
import ru.itplanet.trampline.profile.client.ModerationServiceClient
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.dao.EmployerVerificationDao
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.dao.dto.EmployerVerificationDto
import ru.itplanet.trampline.profile.exception.ProfileBadRequestException
import ru.itplanet.trampline.profile.exception.ProfileConflictException
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.exception.ProfileIntegrationException
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.enums.VerificationMethod
import ru.itplanet.trampline.profile.model.enums.VerificationStatus
import ru.itplanet.trampline.profile.model.request.EmployerVerificationRequest
import ru.itplanet.trampline.profile.model.response.EmployerVerificationResponse
import java.time.OffsetDateTime

@Primary
@Service
class EmployerVerificationServiceImpl(
    private val employerVerificationDao: EmployerVerificationDao,
    private val employerProfileDao: EmployerProfileDao,
    private val mediaServiceClient: MediaServiceClient,
    private val moderationServiceClient: ModerationServiceClient,
    private val objectMapper: ObjectMapper,
) : EmployerVerificationService {

    @Transactional
    override fun createVerificationRequest(
        employerUserId: Long,
        request: EmployerVerificationRequest,
    ): EmployerVerificationResponse {
        val profile = employerProfileDao.findById(employerUserId)
            .orElseThrow {
                ProfileNotFoundException(
                    message = "Профиль работодателя с идентификатором пользователя $employerUserId не найден",
                    code = "employer_profile_not_found",
                )
            }

        val hasPending = employerVerificationDao.existsByEmployerUserIdAndStatus(
            employerUserId,
            VerificationStatus.PENDING,
        )
        if (hasPending) {
            throw ProfileConflictException(
                message = "У вас уже есть активный запрос на верификацию работодателя",
                code = "employer_verification_pending",
            )
        }

        if (profile.verificationStatus == VerificationStatus.APPROVED) {
            throw ProfileConflictException(
                message = "Компания уже верифицирована. Повторная отправка не требуется",
                code = "employer_already_verified",
            )
        }

        val method = when (request.verificationMethod.uppercase()) {
            "EMAIL", "CORPORATE_EMAIL" -> VerificationMethod.CORPORATE_EMAIL
            "INN", "TIN" -> VerificationMethod.TIN
            "PROFESSIONAL_LINKS", "LINKS" -> VerificationMethod.PROFESSIONAL_LINKS
            "MANUAL" -> VerificationMethod.MANUAL
            else -> throw ProfileBadRequestException(
                message = "Указан некорректный способ верификации работодателя",
                code = "invalid_employer_verification_method",
            )
        }

        validateVerificationRequest(
            profile = profile,
            method = method,
            corporateEmail = request.corporateEmail,
            professionalLinks = request.professionalLinks,
        )

        val entity = EmployerVerificationDto(
            employerUserId = employerUserId,
            verificationMethod = method,
            corporateEmail = request.corporateEmail,
            inn = profile.inn,
            professionalLinks = request.professionalLinks,
            submittedComment = request.submittedComment,
        )

        val saved = employerVerificationDao.save(entity)
        profile.verificationStatus = VerificationStatus.PENDING

        val response = toResponse(saved)

        runModerationAction(
            logMessage = "Не удалось создать задачу модерации для employerUserId=$employerUserId",
            errorMessage = "Не удалось отправить запрос на верификацию в модерацию",
            code = "employer_verification_task_create_failed",
        ) {
            moderationServiceClient.createTask(
                CreateInternalModerationTaskRequest(
                    entityType = ModerationEntityType.EMPLOYER_VERIFICATION,
                    entityId = response.id,
                    taskType = ModerationTaskType.VERIFICATION_REVIEW,
                    priority = ModerationTaskPriority.MEDIUM,
                    createdByUserId = employerUserId,
                    snapshot = objectMapper.valueToTree(response),
                    sourceService = "profile",
                    sourceAction = "createEmployerVerificationRequest",
                ),
            )
        }

        return response
    }

    @Transactional(readOnly = true)
    override fun getModerationTask(
        employerUserId: Long,
        verificationId: Long,
    ): InternalModerationTaskLookupResponse {
        val verification = getOwnedVerification(employerUserId, verificationId)

        return runModerationAction(
            logMessage = "Не удалось получить задачу модерации для verificationId=$verificationId, employerUserId=$employerUserId",
            errorMessage = "Не удалось получить информацию о задаче модерации",
            code = "employer_verification_task_lookup_failed",
        ) {
            moderationServiceClient.getTaskByEntity(
                entityType = ModerationEntityType.EMPLOYER_VERIFICATION,
                entityId = requireNotNull(verification.id),
                taskType = ModerationTaskType.VERIFICATION_REVIEW,
            )
        }
    }

    @Transactional(readOnly = true)
    override fun getAttachments(
        employerUserId: Long,
        verificationId: Long,
    ): List<InternalFileAttachmentResponse> {
        val verification = getOwnedVerification(employerUserId, verificationId)

        return runMediaAction(
            logMessage = "Не удалось загрузить список вложений для verificationId=$verificationId, employerUserId=$employerUserId",
            errorMessage = "Не удалось получить вложения запроса на верификацию",
            code = "employer_verification_attachments_load_failed",
        ) {
            loadVerificationAttachments(requireNotNull(verification.id))
        }
    }

    @Transactional
    override fun cancelModerationTask(
        employerUserId: Long,
        verificationId: Long,
    ) {
        val verification = getOwnedVerification(employerUserId, verificationId)
        ensureVerificationIsOpen(verification)

        val taskLookup = runModerationAction(
            logMessage = "Не удалось получить задачу модерации для отмены verificationId=$verificationId, employerUserId=$employerUserId",
            errorMessage = "Не удалось получить задачу модерации для отмены",
            code = "employer_verification_task_lookup_failed",
        ) {
            moderationServiceClient.getTaskByEntity(
                entityType = ModerationEntityType.EMPLOYER_VERIFICATION,
                entityId = requireNotNull(verification.id),
                taskType = ModerationTaskType.VERIFICATION_REVIEW,
            )
        }

        val taskId = taskLookup.taskId
        if (taskLookup.exists && taskId != null) {
            runModerationAction(
                logMessage = "Не удалось отменить задачу модерации taskId=$taskId, verificationId=$verificationId",
                errorMessage = "Не удалось отменить задачу модерации",
                code = "employer_verification_task_cancel_failed",
            ) {
                moderationServiceClient.cancelTask(taskId)
            }
        }

        verification.status = VerificationStatus.REJECTED
        verification.reviewComment = "Запрос на верификацию отменён работодателем"
        verification.reviewedAt = OffsetDateTime.now()
        verification.reviewedByUserId = null

        employerProfileDao.findById(verification.employerUserId).orElse(null)?.let { profile ->
            profile.verificationStatus = VerificationStatus.REJECTED
        }
    }

    @Transactional
    override fun addAttachment(
        employerUserId: Long,
        verificationId: Long,
        file: MultipartFile,
    ): List<InternalFileAttachmentResponse> {
        val verification = getOwnedVerification(employerUserId, verificationId)
        ensureVerificationIsOpen(verification)

        val createdFile = runMediaAction(
            logMessage = "Не удалось загрузить вложение для verificationId=$verificationId, employerUserId=$employerUserId",
            errorMessage = "Не удалось загрузить вложение для запроса на верификацию",
            code = "employer_verification_attachment_upload_failed",
        ) {
            mediaServiceClient.uploadFile(
                file = file,
                ownerUserId = verification.employerUserId,
                kind = FileAssetKind.VERIFICATION_ATTACHMENT,
                visibility = FileAssetVisibility.PRIVATE,
            )
        }

        runMediaAction(
            logMessage = "Не удалось создать вложение для verificationId=$verificationId",
            errorMessage = "Не удалось привязать вложение к запросу на верификацию",
            code = "employer_verification_attachment_create_failed",
        ) {
            mediaServiceClient.createAttachment(
                InternalCreateFileAttachmentRequest(
                    fileId = createdFile.fileId,
                    entityType = FileAttachmentEntityType.EMPLOYER_VERIFICATION,
                    entityId = verificationId,
                    attachmentRole = FileAttachmentRole.VERIFICATION,
                ),
            )
        }

        return runMediaAction(
            logMessage = "Не удалось загрузить список вложений для verificationId=$verificationId",
            errorMessage = "Не удалось получить вложения запроса на верификацию",
            code = "employer_verification_attachments_load_failed",
        ) {
            loadVerificationAttachments(verificationId)
        }
    }

    private fun validateVerificationRequest(
        profile: EmployerProfileDto,
        method: VerificationMethod,
        corporateEmail: String?,
        professionalLinks: List<String>,
    ) {
        when (method) {
            VerificationMethod.CORPORATE_EMAIL -> {
                if (corporateEmail.isNullOrBlank()) {
                    throw ProfileBadRequestException(
                        message = "Для верификации по корпоративной почте укажите корпоративный email",
                        code = "employer_verification_corporate_email_required",
                    )
                }
            }

            VerificationMethod.TIN -> {
                if (profile.legalName.isNullOrBlank()) {
                    throw ProfileBadRequestException(
                        message = "Перед верификацией по ИНН укажите юридическое название компании",
                        code = "employer_company_legal_name_required",
                    )
                }
                if (profile.inn.isNullOrBlank()) {
                    throw ProfileBadRequestException(
                        message = "Для верификации по ИНН сначала заполните ИНН в данных компании",
                        code = "employer_company_inn_required",
                    )
                }
            }

            VerificationMethod.PROFESSIONAL_LINKS -> {
                if (professionalLinks.isEmpty()) {
                    throw ProfileBadRequestException(
                        message = "Для верификации по профессиональным ссылкам добавьте хотя бы одну ссылку",
                        code = "employer_verification_links_required",
                    )
                }
            }

            VerificationMethod.MANUAL -> Unit
        }
    }

    private fun getOwnedVerification(
        employerUserId: Long,
        verificationId: Long,
    ): EmployerVerificationDto {
        val verification = employerVerificationDao.findById(verificationId)
            .orElseThrow {
                ProfileNotFoundException(
                    message = "Запрос на верификацию с идентификатором $verificationId не найден",
                    code = "employer_verification_not_found",
                )
            }

        ensureVerificationOwner(
            employerUserId = employerUserId,
            verification = verification,
        )

        return verification
    }

    private fun ensureVerificationOwner(
        employerUserId: Long,
        verification: EmployerVerificationDto,
    ) {
        if (verification.employerUserId != employerUserId) {
            throw ProfileForbiddenException(
                message = "Только владелец запроса на верификацию может управлять им",
                code = "employer_verification_owner_required",
            )
        }
    }

    private fun ensureVerificationIsOpen(
        verification: EmployerVerificationDto,
    ) {
        if (verification.status != VerificationStatus.PENDING) {
            throw ProfileConflictException(
                message = "Запрос на верификацию уже закрыт",
                code = "employer_verification_already_closed",
            )
        }
    }

    private fun loadVerificationAttachments(
        verificationId: Long,
    ): List<InternalFileAttachmentResponse> {
        return mediaServiceClient.getAttachments(
            entityType = FileAttachmentEntityType.EMPLOYER_VERIFICATION,
            entityId = verificationId,
        )
            .filter { it.attachmentRole == FileAttachmentRole.VERIFICATION }
            .map { it.withPrivateFileVisibility() }
    }

    private fun InternalFileAttachmentResponse.withPrivateFileVisibility(): InternalFileAttachmentResponse {
        return copy(
            file = file.copy(
                visibility = FileAssetVisibility.PRIVATE,
            ),
        )
    }

    private fun toResponse(entity: EmployerVerificationDto): EmployerVerificationResponse {
        return EmployerVerificationResponse(
            id = requireNotNull(entity.id),
            employerUserId = entity.employerUserId,
            status = entity.status.name,
            verificationMethod = entity.verificationMethod?.name ?: "",
            corporateEmail = entity.corporateEmail,
            inn = entity.inn,
            professionalLinks = entity.professionalLinks,
            submittedComment = entity.submittedComment,
            submittedAt = entity.submittedAt,
            createdAt = entity.createdAt,
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

    companion object {
        private val logger = LoggerFactory.getLogger(EmployerVerificationServiceImpl::class.java)
    }
}
