package ru.itplanet.trampline.profile.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.context.annotation.Primary
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
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
import ru.itplanet.trampline.profile.dao.dto.EmployerVerificationDto
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
        val hasPending = employerVerificationDao.existsByEmployerUserIdAndStatus(
            employerUserId,
            VerificationStatus.PENDING,
        )
        if (hasPending) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "You already have a pending verification request",
            )
        }

        val method = when (request.verificationMethod.uppercase()) {
            "EMAIL", "CORPORATE_EMAIL" -> VerificationMethod.CORPORATE_EMAIL
            "INN", "TIN" -> VerificationMethod.TIN
            "PROFESSIONAL_LINKS", "LINKS" -> VerificationMethod.PROFESSIONAL_LINKS
            "MANUAL" -> VerificationMethod.MANUAL
            else -> throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid verification method",
            )
        }

        val entity = EmployerVerificationDto(
            employerUserId = employerUserId,
            verificationMethod = method,
            corporateEmail = request.corporateEmail,
            inn = request.inn,
            professionalLinks = request.professionalLinks,
            submittedComment = request.submittedComment,
        )

        val saved = employerVerificationDao.save(entity)
        val response = toResponse(saved)

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

        return response
    }

    @Transactional(readOnly = true)
    override fun getModerationTask(
        employerUserId: Long,
        verificationId: Long,
    ): InternalModerationTaskLookupResponse {
        val verification = getOwnedVerification(employerUserId, verificationId)

        return moderationServiceClient.getTaskByEntity(
            entityType = ModerationEntityType.EMPLOYER_VERIFICATION,
            entityId = requireNotNull(verification.id),
            taskType = ModerationTaskType.VERIFICATION_REVIEW,
        )
    }

    @Transactional
    override fun cancelModerationTask(
        employerUserId: Long,
        verificationId: Long,
    ) {
        val verification = getOwnedVerification(employerUserId, verificationId)
        ensureVerificationIsOpen(verification)

        val taskLookup = moderationServiceClient.getTaskByEntity(
            entityType = ModerationEntityType.EMPLOYER_VERIFICATION,
            entityId = requireNotNull(verification.id),
            taskType = ModerationTaskType.VERIFICATION_REVIEW,
        )

        val taskId = taskLookup.taskId
        if (taskLookup.exists && taskId != null) {
            moderationServiceClient.cancelTask(taskId)
        }

        verification.status = VerificationStatus.REJECTED
        verification.reviewComment = "Verification request cancelled by employer"
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

        val createdFile = mediaServiceClient.uploadFile(
            file = file,
            ownerUserId = verification.employerUserId,
            kind = FileAssetKind.VERIFICATION_ATTACHMENT,
            visibility = FileAssetVisibility.PRIVATE,
        )

        mediaServiceClient.createAttachment(
            InternalCreateFileAttachmentRequest(
                fileId = createdFile.fileId,
                entityType = FileAttachmentEntityType.EMPLOYER_VERIFICATION,
                entityId = verificationId,
                attachmentRole = FileAttachmentRole.VERIFICATION,
            ),
        )

        return loadVerificationAttachments(verificationId)
    }

    private fun getOwnedVerification(
        employerUserId: Long,
        verificationId: Long,
    ): EmployerVerificationDto {
        val verification = employerVerificationDao.findById(verificationId)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Verification not found")
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
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only verification owner can manage verification",
            )
        }
    }

    private fun ensureVerificationIsOpen(
        verification: EmployerVerificationDto,
    ) {
        if (verification.status != VerificationStatus.PENDING) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Verification is already closed",
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
}
