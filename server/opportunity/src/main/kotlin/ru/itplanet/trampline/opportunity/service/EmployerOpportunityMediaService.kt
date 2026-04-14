package ru.itplanet.trampline.opportunity.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetVisibility
import ru.itplanet.trampline.commons.model.file.FileAttachmentEntityType
import ru.itplanet.trampline.commons.model.file.FileAttachmentRole
import ru.itplanet.trampline.commons.model.file.InternalCreateFileAttachmentRequest
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.opportunity.client.MediaServiceClient
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.exception.OpportunityConflictException
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundDomainException

@Service
@Transactional
class EmployerOpportunityMediaService(
    private val opportunityDao: OpportunityDao,
    private val mediaServiceClient: MediaServiceClient,
    private val employerOpportunityModerationService: EmployerOpportunityModerationService,
) {

    fun addMedia(
        currentUserId: Long,
        opportunityId: Long,
        file: MultipartFile,
    ): List<InternalFileAttachmentResponse> {
        val opportunity = loadManageableOwnedOpportunity(currentUserId, opportunityId)
        val wasPublished = opportunity.status == OpportunityStatus.PUBLISHED
        val existingAttachments = getMediaAttachments(opportunityId)

        val createdFile = mediaServiceClient.uploadFile(
            file = file,
            ownerUserId = currentUserId,
            kind = FileAssetKind.OPPORTUNITY_MEDIA,
            visibility = FileAssetVisibility.PUBLIC,
        )

        mediaServiceClient.createAttachment(
            InternalCreateFileAttachmentRequest(
                fileId = createdFile.fileId,
                entityType = FileAttachmentEntityType.OPPORTUNITY,
                entityId = requireNotNull(opportunity.id),
                attachmentRole = FileAttachmentRole.MEDIA,
                sortOrder = nextSortOrder(existingAttachments),
            ),
        )

        val updatedAttachments = getMediaAttachments(opportunityId)

        if (wasPublished) {
            employerOpportunityModerationService.submitAfterMediaChanged(
                employerUserId = currentUserId,
                opportunityId = opportunityId,
                mediaAttachments = updatedAttachments,
                sourceAction = "addOpportunityMedia",
            )
        }

        return updatedAttachments
    }

    fun deleteMedia(
        currentUserId: Long,
        opportunityId: Long,
        attachmentId: Long,
    ): List<InternalFileAttachmentResponse> {
        val opportunity = loadManageableOwnedOpportunity(currentUserId, opportunityId)
        val wasPublished = opportunity.status == OpportunityStatus.PUBLISHED

        val attachment = getMediaAttachments(opportunityId)
            .firstOrNull { it.attachmentId == attachmentId }
            ?: throw OpportunityNotFoundDomainException(
                message = "Медиафайл возможности не найден",
                code = "opportunity_media_not_found",
            )

        mediaServiceClient.deleteAttachment(attachment.attachmentId)

        val updatedAttachments = getMediaAttachments(opportunityId)

        if (wasPublished) {
            employerOpportunityModerationService.submitAfterMediaChanged(
                employerUserId = currentUserId,
                opportunityId = opportunityId,
                mediaAttachments = updatedAttachments,
                sourceAction = "deleteOpportunityMedia",
            )
        }

        return updatedAttachments
    }

    private fun loadOwnedOpportunity(
        currentUserId: Long,
        opportunityId: Long,
    ): OpportunityDto {
        return opportunityDao.findByIdAndEmployerUserId(opportunityId, currentUserId)
            .orElseThrow {
                OpportunityNotFoundDomainException(
                    message = "Возможность не найдена",
                    code = "opportunity_not_found",
                )
            }
    }

    private fun loadManageableOwnedOpportunity(
        currentUserId: Long,
        opportunityId: Long,
    ): OpportunityDto {
        val opportunity = loadOwnedOpportunity(currentUserId, opportunityId)
        validateMediaEditableStatus(opportunity)
        return opportunity
    }

    private fun validateMediaEditableStatus(opportunity: OpportunityDto) {
        if (opportunity.status !in mediaEditableStatuses) {
            throw OpportunityConflictException(
                message = "Нельзя изменять медиа у возможности в статусе ${opportunity.status.name}",
                code = "opportunity_media_edit_not_allowed",
            )
        }
    }

    private fun getMediaAttachments(
        opportunityId: Long,
    ): List<InternalFileAttachmentResponse> {
        return mediaServiceClient.getAttachments(
            entityType = FileAttachmentEntityType.OPPORTUNITY,
            entityId = opportunityId,
        ).filter { it.attachmentRole == FileAttachmentRole.MEDIA }
            .sortedWith(compareBy<InternalFileAttachmentResponse>({ it.sortOrder }, { it.attachmentId }))
    }

    private fun nextSortOrder(
        attachments: List<InternalFileAttachmentResponse>,
    ): Int {
        return attachments.maxOfOrNull { it.sortOrder }?.plus(1) ?: 0
    }

    private companion object {
        private val mediaEditableStatuses = setOf(
            OpportunityStatus.DRAFT,
            OpportunityStatus.REJECTED,
            OpportunityStatus.PLANNED,
            OpportunityStatus.PUBLISHED,
        )
    }
}
