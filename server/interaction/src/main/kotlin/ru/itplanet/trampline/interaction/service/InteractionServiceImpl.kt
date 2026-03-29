package ru.itplanet.trampline.interaction.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import feign.FeignException
import jakarta.persistence.EntityNotFoundException
import org.apache.coyote.BadRequestException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.model.OpportunityCard
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.interaction.client.MediaServiceClient
import ru.itplanet.trampline.interaction.client.OpportunityServiceClient
import ru.itplanet.trampline.interaction.dao.ContactDao
import ru.itplanet.trampline.interaction.dao.ContactInfoApplicantProfileDao
import ru.itplanet.trampline.interaction.dao.ContactRecommendationDao
import ru.itplanet.trampline.interaction.dao.FavoriteDao
import ru.itplanet.trampline.interaction.dao.OpportunityResponseDao
import ru.itplanet.trampline.interaction.dao.dto.ContactDto
import ru.itplanet.trampline.interaction.dao.dto.ContactDtoId
import ru.itplanet.trampline.interaction.dao.dto.ContactInfoApplicantProfileDto
import ru.itplanet.trampline.interaction.dao.dto.ContactRecommendationDto
import ru.itplanet.trampline.interaction.dao.dto.ContactStatus
import ru.itplanet.trampline.interaction.dao.dto.FavoriteDto
import ru.itplanet.trampline.interaction.dao.dto.FavoriteTargetType
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto
import ru.itplanet.trampline.interaction.model.request.ContactRequest
import ru.itplanet.trampline.interaction.model.request.CreateContactRecommendationRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseStatusUpdateRequest
import ru.itplanet.trampline.interaction.model.response.ContactRecommendationResponse
import ru.itplanet.trampline.interaction.model.response.ContactResponse
import ru.itplanet.trampline.interaction.model.response.FavoriteResponse
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse
import java.time.OffsetDateTime

@Service
@Transactional
class InteractionServiceImpl(
    private val opportunityResponseDao: OpportunityResponseDao,
    private val favoriteDao: FavoriteDao,
    private val contactRepository: ContactDao,
    private val contactInfoApplicantProfileDao: ContactInfoApplicantProfileDao,
    private val contactRecommendationDao: ContactRecommendationDao,
    private val opportunityServiceClient: OpportunityServiceClient,
    private val mediaServiceClient: MediaServiceClient,
    private val objectMapper: ObjectMapper,
) : InteractionService {

    override fun apply(
        userId: Long,
        request: OpportunityResponseRequest,
    ): OpportunityResponseResponse {
        val opportunity = opportunityServiceClient.getPublicOpportunity(request.opportunityId)

        if (opportunityResponseDao.existsByApplicantUserIdAndOpportunityId(userId, request.opportunityId)) {
            throw RuntimeException("You have already applied to this opportunity")
        }

        if (opportunity.status != OpportunityStatus.PUBLISHED) {
            throw BadRequestException("This opportunity is not open for applications")
        }

        val resumeFile = validateResumeFile(userId, request.resumeFileId)

        val opportunityResponseDto = OpportunityResponseDto(
            applicantUserId = userId,
            opportunityId = request.opportunityId,
            applicantComment = request.applicantComment,
            coverLetter = request.coverLetter,
            resumeFileId = resumeFile?.fileId,
            resumeSnapshot = buildResumeSnapshot(resumeFile),
        )

        val saved = opportunityResponseDao.save(opportunityResponseDto)
        return toOpportunityResponseResponse(saved, opportunity.title)
    }

    override fun updateApplicationStatus(
        applicationId: Long,
        currentUserId: Long,
        request: OpportunityResponseStatusUpdateRequest,
    ): OpportunityResponseResponse {
        val opportunityResponseDto = opportunityResponseDao.findById(applicationId)
            .orElseThrow { EntityNotFoundException("Response not found") }

        val opportunity = opportunityServiceClient.getPublicOpportunity(opportunityResponseDto.opportunityId)

        if (opportunity.employerUserId != currentUserId) {
            throw AccessDeniedException("You are not the owner of this opportunity")
        }

        opportunityResponseDto.status = request.status
        opportunityResponseDto.employerComment = request.employerComment ?: opportunityResponseDto.employerComment
        opportunityResponseDto.respondedAt = OffsetDateTime.now()

        val saved = opportunityResponseDao.save(opportunityResponseDto)
        return toOpportunityResponseResponse(saved, opportunity.title)
    }

    override fun getUserApplications(userId: Long): List<OpportunityResponseResponse> {
        return opportunityResponseDao.findByApplicantUserId(userId).map { app ->
            val opportunity = opportunityServiceClient.getPublicOpportunity(app.opportunityId)
            toOpportunityResponseResponse(app, opportunity.title)
        }
    }

    override fun getOpportunityApplications(
        opportunityId: Long,
        currentUserId: Long,
    ): List<OpportunityResponseResponse> {
        val opportunity = opportunityServiceClient.getPublicOpportunity(opportunityId)

        if (opportunity.employerUserId != currentUserId) {
            throw AccessDeniedException("You are not the owner of this opportunity")
        }

        return opportunityResponseDao.findByOpportunityId(opportunityId).map { app ->
            toOpportunityResponseResponse(app, opportunity.title)
        }
    }

    override fun addToFavorites(userId: Long, opportunityId: Long): FavoriteResponse {
        if (!favoriteDao.existsByUserIdAndOpportunityId(userId, opportunityId)) {
            val favoriteDto = FavoriteDto(userId, opportunityId, FavoriteTargetType.OPPORTUNITY)
            favoriteDao.save(favoriteDto)
        }

        val opportunity = opportunityServiceClient.getPublicOpportunity(opportunityId)
        return FavoriteResponse(opportunityId, opportunity.title, OffsetDateTime.now())
    }

    override fun removeFromFavorites(userId: Long, opportunityId: Long) {
        favoriteDao.deleteByUserIdAndOpportunityId(userId, opportunityId)
    }

    override fun getUserFavorites(userId: Long): List<FavoriteResponse> {
        return favoriteDao.findByUserId(userId).map { fav ->
            val opportunity = opportunityServiceClient.getPublicOpportunity(fav.opportunityId)
            FavoriteResponse(fav.opportunityId, opportunity.title, fav.createdAt)
        }
    }

    override fun addContact(userId: Long, request: ContactRequest): ContactResponse {
        if (userId == request.contactUserId) {
            throw BadRequestException("You cannot add yourself as a contact")
        }

        val (low, high) = orderedPair(userId, request.contactUserId)

        if (contactRepository.existsByIdUserLowIdAndIdUserHighId(low, high)) {
            throw RuntimeException("Contact already exists")
        }

        val contactDtoId = ContactDtoId(low, high)
        val contactDto = ContactDto(contactDtoId, userId)
        val saved = contactRepository.save(contactDto)

        return toContactResponse(userId, saved)
    }

    override fun respondContact(
        userId: Long,
        contactUserId: Long,
        status: ContactStatus,
    ): ContactResponse {
        val (low, high) = orderedPair(userId, contactUserId)

        val contact = contactRepository.findByIdUserLowIdAndIdUserHighId(low, high)
            ?: throw EntityNotFoundException("Contact request not found")

        if (contact.initiatedByUserId != contactUserId) {
            throw AccessDeniedException("You are not the recipient of this request")
        }

        contact.status = status
        contact.respondedAt = OffsetDateTime.now()

        val saved = contactRepository.save(contact)
        return toContactResponse(userId, saved)
    }

    override fun removeContact(userId: Long, contactUserId: Long) {
        val (low, high) = orderedPair(userId, contactUserId)

        val contact = contactRepository.findByIdUserLowIdAndIdUserHighId(low, high)
            ?: throw EntityNotFoundException("Contact not found")

        contactRepository.delete(contact)
    }

    override fun getUserContacts(userId: Long): List<ContactResponse> {
        val asLow = contactRepository.findByIdUserLowIdAndStatus(userId, ContactStatus.ACCEPTED)
        val asHigh = contactRepository.findByIdUserHighIdAndStatus(userId, ContactStatus.ACCEPTED)

        return (asLow + asHigh)
            .map { toContactResponse(userId, it) }
            .distinctBy { it.contactUserId }
    }

    override fun createRecommendation(
        userId: Long,
        request: CreateContactRecommendationRequest,
    ): ContactRecommendationResponse {
        if (userId == request.toApplicantUserId) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "You cannot recommend an opportunity to yourself",
            )
        }

        val fromApplicant = loadApplicant(userId)
        val toApplicant = loadApplicant(request.toApplicantUserId)

        ensureAcceptedContact(userId, request.toApplicantUserId)

        val opportunity = opportunityServiceClient.getPublicOpportunity(request.opportunityId)
        if (opportunity.status != OpportunityStatus.PUBLISHED) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Only published opportunity can be recommended",
            )
        }

        val normalizedMessage = normalizeMessage(request.message)

        if (
            contactRecommendationDao.existsByOpportunityIdAndFromApplicantUserIdAndToApplicantUserId(
                opportunityId = request.opportunityId,
                fromApplicantUserId = userId,
                toApplicantUserId = request.toApplicantUserId,
            )
        ) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "You have already recommended this opportunity to this contact",
            )
        }

        val saved = try {
            contactRecommendationDao.save(
                ContactRecommendationDto(
                    opportunityId = request.opportunityId,
                    fromApplicantUserId = userId,
                    toApplicantUserId = request.toApplicantUserId,
                    message = normalizedMessage,
                ),
            )
        } catch (_: DataIntegrityViolationException) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "You have already recommended this opportunity to this contact",
            )
        }

        return toContactRecommendationResponse(
            recommendation = saved,
            opportunity = opportunity,
            fromApplicant = fromApplicant,
            toApplicant = toApplicant,
        )
    }

    override fun getIncomingRecommendations(userId: Long): List<ContactRecommendationResponse> {
        loadApplicant(userId)

        val recommendations = contactRecommendationDao.findByToApplicantUserIdOrderByCreatedAtDescIdDesc(userId)
        return mapRecommendations(recommendations)
    }

    override fun getOutgoingRecommendations(userId: Long): List<ContactRecommendationResponse> {
        loadApplicant(userId)

        val recommendations = contactRecommendationDao.findByFromApplicantUserIdOrderByCreatedAtDescIdDesc(userId)
        return mapRecommendations(recommendations)
    }

    override fun deleteRecommendation(
        userId: Long,
        recommendationId: Long,
    ) {
        loadApplicant(userId)

        val recommendation = contactRecommendationDao.findByIdAndFromApplicantUserId(
            id = recommendationId,
            fromApplicantUserId = userId,
        ) ?: throw EntityNotFoundException("Recommendation not found")

        contactRecommendationDao.delete(recommendation)
    }

    private fun mapRecommendations(
        recommendations: List<ContactRecommendationDto>,
    ): List<ContactRecommendationResponse> {
        val applicantCache = mutableMapOf<Long, ContactInfoApplicantProfileDto>()
        val opportunityCache = mutableMapOf<Long, OpportunityCard>()

        return recommendations.map { recommendation ->
            val opportunity = opportunityCache.getOrPut(recommendation.opportunityId) {
                opportunityServiceClient.getPublicOpportunity(recommendation.opportunityId)
            }

            val fromApplicant = applicantCache.getOrPut(recommendation.fromApplicantUserId) {
                loadApplicant(recommendation.fromApplicantUserId)
            }

            val toApplicant = applicantCache.getOrPut(recommendation.toApplicantUserId) {
                loadApplicant(recommendation.toApplicantUserId)
            }

            toContactRecommendationResponse(
                recommendation = recommendation,
                opportunity = opportunity,
                fromApplicant = fromApplicant,
                toApplicant = toApplicant,
            )
        }
    }

    private fun validateResumeFile(
        userId: Long,
        resumeFileId: Long?,
    ): InternalFileMetadataResponse? {
        if (resumeFileId == null) {
            return null
        }

        val file = try {
            mediaServiceClient.getMetadata(resumeFileId)
        } catch (ex: FeignException.NotFound) {
            throw BadRequestException("Resume file not found")
        }

        if (file.ownerUserId != userId) {
            throw AccessDeniedException("Resume file does not belong to current user")
        }

        if (file.kind != FileAssetKind.RESUME) {
            throw BadRequestException("Provided file is not a resume")
        }

        if (file.status != FileAssetStatus.READY) {
            throw BadRequestException("Resume file is not ready")
        }

        return file
    }

    private fun buildResumeSnapshot(
        resumeFile: InternalFileMetadataResponse?,
    ): JsonNode {
        if (resumeFile == null) {
            return objectMapper.createObjectNode()
        }

        return objectMapper.valueToTree(
            mapOf(
                "fileId" to resumeFile.fileId,
                "ownerUserId" to resumeFile.ownerUserId,
                "originalFileName" to resumeFile.originalFileName,
                "mediaType" to resumeFile.mediaType,
                "sizeBytes" to resumeFile.sizeBytes,
                "checksumSha256" to resumeFile.checksumSha256,
                "kind" to resumeFile.kind.name,
                "visibility" to resumeFile.visibility.name,
                "status" to resumeFile.status.name,
                "createdAt" to resumeFile.createdAt,
                "updatedAt" to resumeFile.updatedAt,
            ),
        )
    }

    private fun ensureAcceptedContact(
        firstUserId: Long,
        secondUserId: Long,
    ) {
        val (low, high) = orderedPair(firstUserId, secondUserId)

        val isAccepted = contactRepository.existsByIdUserLowIdAndIdUserHighIdAndStatus(
            userLowId = low,
            userHighId = high,
            status = ContactStatus.ACCEPTED,
        )

        if (!isAccepted) {
            throw AccessDeniedException(
                "You can recommend opportunities only to accepted contacts",
            )
        }
    }

    private fun loadApplicant(
        userId: Long,
    ): ContactInfoApplicantProfileDto {
        return contactInfoApplicantProfileDao.findById(userId)
            .orElseThrow { EntityNotFoundException("Applicant $userId not found") }
    }

    private fun orderedPair(
        firstUserId: Long,
        secondUserId: Long,
    ): Pair<Long, Long> {
        return if (firstUserId < secondUserId) {
            firstUserId to secondUserId
        } else {
            secondUserId to firstUserId
        }
    }

    private fun normalizeMessage(
        value: String?,
    ): String? {
        return value?.trim()?.takeIf { it.isNotEmpty() }
    }

    private fun toOpportunityResponseResponse(
        oppResp: OpportunityResponseDto,
        title: String?,
    ): OpportunityResponseResponse {
        return OpportunityResponseResponse(
            id = oppResp.id!!,
            opportunityId = oppResp.opportunityId,
            applicantUserId = oppResp.applicantUserId,
            opportunityTitle = title,
            status = oppResp.status,
            employerComment = oppResp.employerComment,
            applicantComment = oppResp.applicantComment,
            coverLetter = oppResp.coverLetter,
            resumeFileId = oppResp.resumeFileId,
            createdAt = oppResp.createdAt,
        )
    }

    private fun toContactResponse(
        currentUserId: Long,
        contact: ContactDto,
    ): ContactResponse {
        val contactUserId =
            if (contact.initiatedByUserId == currentUserId && contact.id.userLowId == currentUserId) {
                contact.id.userHighId
            } else {
                contact.id.userLowId
            }

        val userDto = contactInfoApplicantProfileDao.findById(contactUserId)
            .orElseThrow { EntityNotFoundException("User $contactUserId not found") }

        val contactName = fullApplicantName(userDto)

        return ContactResponse(
            contactUserId,
            contactName,
            contact.status,
            contact.createdAt,
        )
    }

    private fun toContactRecommendationResponse(
        recommendation: ContactRecommendationDto,
        opportunity: OpportunityCard,
        fromApplicant: ContactInfoApplicantProfileDto,
        toApplicant: ContactInfoApplicantProfileDto,
    ): ContactRecommendationResponse {
        return ContactRecommendationResponse(
            id = recommendation.id ?: error("Recommendation id must not be null"),
            opportunityId = recommendation.opportunityId,
            opportunityTitle = opportunity.title,
            opportunityType = opportunity.type,
            companyName = opportunity.companyName,
            fromApplicantUserId = recommendation.fromApplicantUserId,
            fromApplicantName = fullApplicantName(fromApplicant),
            toApplicantUserId = recommendation.toApplicantUserId,
            toApplicantName = fullApplicantName(toApplicant),
            message = recommendation.message,
            createdAt = recommendation.createdAt,
        )
    }

    private fun fullApplicantName(
        applicant: ContactInfoApplicantProfileDto,
    ): String {
        return listOfNotNull(
            applicant.firstName.takeIf { it.isNotBlank() },
            applicant.middleName?.takeIf { it.isNotBlank() },
            applicant.lastName.takeIf { it.isNotBlank() },
        ).joinToString(" ").trim()
    }
}
