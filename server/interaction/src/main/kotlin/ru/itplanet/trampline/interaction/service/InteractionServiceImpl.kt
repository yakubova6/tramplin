package ru.itplanet.trampline.interaction.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import feign.FeignException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.OpportunityCard
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.commons.model.file.FileAssetKind
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.commons.model.profile.ApplicantProfileModerationStatus
import ru.itplanet.trampline.interaction.client.EmployerProfileSummary
import ru.itplanet.trampline.interaction.client.MediaServiceClient
import ru.itplanet.trampline.interaction.client.OpportunityServiceClient
import ru.itplanet.trampline.interaction.client.ProfileServiceClient
import ru.itplanet.trampline.interaction.dao.ContactDao
import ru.itplanet.trampline.interaction.dao.ContactInfoApplicantProfileDao
import ru.itplanet.trampline.interaction.dao.ContactRecommendationDao
import ru.itplanet.trampline.interaction.dao.EmployerResponseQueryDao
import ru.itplanet.trampline.interaction.dao.FavoriteDao
import ru.itplanet.trampline.interaction.dao.OpportunityResponseDao
import ru.itplanet.trampline.interaction.dao.dto.ContactDto
import ru.itplanet.trampline.interaction.dao.dto.ContactDtoId
import ru.itplanet.trampline.interaction.dao.dto.ContactInfoApplicantProfileDto
import ru.itplanet.trampline.interaction.dao.dto.ContactRecommendationDto
import ru.itplanet.trampline.interaction.dao.dto.ContactRecommendationStatus
import ru.itplanet.trampline.interaction.dao.dto.ContactStatus
import ru.itplanet.trampline.interaction.dao.dto.FavoriteDto
import ru.itplanet.trampline.interaction.dao.dto.FavoriteTargetType
import ru.itplanet.trampline.interaction.dao.dto.OpportunityResponseDto
import ru.itplanet.trampline.interaction.exception.InteractionBadRequestException
import ru.itplanet.trampline.interaction.exception.InteractionConflictException
import ru.itplanet.trampline.interaction.exception.InteractionForbiddenException
import ru.itplanet.trampline.interaction.exception.InteractionIntegrationException
import ru.itplanet.trampline.interaction.exception.InteractionNotFoundException
import ru.itplanet.trampline.interaction.model.request.ContactRequest
import ru.itplanet.trampline.interaction.model.request.CreateContactRecommendationRequest
import ru.itplanet.trampline.interaction.model.request.GetEmployerResponseListRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseStatusUpdateRequest
import ru.itplanet.trampline.interaction.model.request.UpdateContactRecommendationStatusRequest
import ru.itplanet.trampline.interaction.model.response.ContactDirection
import ru.itplanet.trampline.interaction.model.response.ContactRecommendationResponse
import ru.itplanet.trampline.interaction.model.response.ContactResponse
import ru.itplanet.trampline.interaction.model.response.EmployerOpportunityResponseItem
import ru.itplanet.trampline.interaction.model.response.EmployerResponsePage
import ru.itplanet.trampline.interaction.model.response.FavoriteResponse
import ru.itplanet.trampline.interaction.model.response.InternalApplicantApplicationResponse
import ru.itplanet.trampline.interaction.model.response.InternalApplicantContactResponse
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse
import java.time.OffsetDateTime

@Service
@Transactional
class InteractionServiceImpl(
    private val opportunityResponseDao: OpportunityResponseDao,
    private val employerResponseQueryDao: EmployerResponseQueryDao,
    private val favoriteDao: FavoriteDao,
    private val contactRepository: ContactDao,
    private val contactInfoApplicantProfileDao: ContactInfoApplicantProfileDao,
    private val contactRecommendationDao: ContactRecommendationDao,
    private val opportunityServiceClient: OpportunityServiceClient,
    private val profileServiceClient: ProfileServiceClient,
    private val mediaServiceClient: MediaServiceClient,
    private val objectMapper: ObjectMapper,
) : InteractionService {

    override fun apply(
        userId: Long,
        request: OpportunityResponseRequest,
    ): OpportunityResponseResponse {
        val opportunity = loadOpportunity(request.opportunityId)

        if (opportunityResponseDao.existsByApplicantUserIdAndOpportunityId(userId, request.opportunityId)) {
            throw InteractionConflictException(
                message = "Вы уже откликались на эту возможность",
                code = "opportunity_already_applied",
            )
        }

        if (opportunity.status != OpportunityStatus.PUBLISHED) {
            throw InteractionConflictException(
                message = "Эта возможность недоступна для отклика",
                code = "opportunity_not_open_for_applications",
            )
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

        markIncomingRecommendationsAsApplied(
            applicantUserId = userId,
            opportunityId = request.opportunityId,
        )

        return toOpportunityResponseResponse(saved, opportunity.title)
    }

    override fun updateApplicationStatus(
        applicationId: Long,
        currentUserId: Long,
        request: OpportunityResponseStatusUpdateRequest,
    ): OpportunityResponseResponse {
        val opportunityResponseDto = opportunityResponseDao.findById(applicationId)
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Отклик не найден",
                    code = "opportunity_response_not_found",
                )
            }

        val opportunity = loadOpportunity(opportunityResponseDto.opportunityId)

        if (opportunity.employerUserId != currentUserId) {
            throw InteractionForbiddenException(
                message = "Изменять статус отклика может только владелец возможности",
                code = "opportunity_owner_required",
            )
        }

        opportunityResponseDto.status = request.status
        opportunityResponseDto.employerComment = request.employerComment ?: opportunityResponseDto.employerComment
        opportunityResponseDto.respondedAt = OffsetDateTime.now()

        val saved = opportunityResponseDao.save(opportunityResponseDto)
        return toOpportunityResponseResponse(saved, opportunity.title)
    }

    override fun getUserApplications(userId: Long): List<OpportunityResponseResponse> {
        return opportunityResponseDao.findByApplicantUserId(userId)
            .sortedWith(
                compareByDescending<OpportunityResponseDto> { it.createdAt ?: OffsetDateTime.MIN }
                    .thenByDescending { it.id ?: Long.MIN_VALUE }
            )
            .map { app ->
                val opportunity = loadOpportunity(app.opportunityId)
                toOpportunityResponseResponse(app, opportunity.title)
            }
    }

    override fun getOpportunityApplications(
        opportunityId: Long,
        currentUserId: Long,
    ): List<OpportunityResponseResponse> {
        val opportunity = loadOpportunity(opportunityId)

        if (opportunity.employerUserId != currentUserId) {
            throw InteractionForbiddenException(
                message = "Просматривать отклики может только владелец возможности",
                code = "opportunity_owner_required",
            )
        }

        return opportunityResponseDao.findByOpportunityId(opportunityId).map { app ->
            toOpportunityResponseResponse(app, opportunity.title)
        }
    }

    override fun getEmployerResponses(
        currentUserId: Long,
        request: GetEmployerResponseListRequest,
    ): EmployerResponsePage<EmployerOpportunityResponseItem> {
        request.opportunityId?.let { opportunityId ->
            val ownerUserId = employerResponseQueryDao.findOpportunityEmployerUserId(opportunityId)
                ?: throw InteractionNotFoundException(
                    message = "Возможность не найдена",
                    code = "opportunity_not_found",
                )

            if (ownerUserId != currentUserId) {
                throw InteractionForbiddenException(
                    message = "Просматривать отклики может только владелец возможности",
                    code = "opportunity_owner_required",
                )
            }
        }

        return employerResponseQueryDao.findResponses(currentUserId, request)
    }

    override fun getApplicantApplicationsForPrivacy(
        userId: Long,
    ): List<InternalApplicantApplicationResponse> {
        return opportunityResponseDao.findByApplicantUserId(userId)
            .sortedWith(
                compareByDescending<OpportunityResponseDto> { it.createdAt ?: OffsetDateTime.MIN }
                    .thenByDescending { it.id ?: Long.MIN_VALUE }
            )
            .map { app ->
                val opportunity = loadOpportunity(app.opportunityId)
                InternalApplicantApplicationResponse(
                    id = app.id!!,
                    opportunityId = app.opportunityId,
                    opportunityTitle = opportunity.title,
                    status = app.status,
                    createdAt = app.createdAt,
                )
            }
    }

    override fun getApplicantContactsForPrivacy(
        userId: Long,
    ): List<InternalApplicantContactResponse> {
        return getAcceptedContactDtos(userId)
            .map { toContactResponse(userId, it) }
            .sortedWith(
                compareByDescending<ContactResponse> { it.createdAt ?: OffsetDateTime.MIN }
                    .thenByDescending { it.contactUserId }
            )
            .map { contact ->
                InternalApplicantContactResponse(
                    contactUserId = contact.contactUserId,
                    contactName = contact.contactName,
                    createdAt = contact.createdAt,
                )
            }
    }

    override fun isAcceptedContact(
        firstUserId: Long,
        secondUserId: Long,
    ): Boolean {
        val (low, high) = orderedPair(firstUserId, secondUserId)

        return contactRepository.existsByIdUserLowIdAndIdUserHighIdAndStatus(
            userLowId = low,
            userHighId = high,
            status = ContactStatus.ACCEPTED,
        )
    }

    override fun hasEmployerAccessToApplicantProfile(
        employerUserId: Long,
        applicantUserId: Long,
    ): Boolean {
        return opportunityResponseDao.existsEmployerAccessToApplicantProfile(
            employerUserId = employerUserId,
            applicantUserId = applicantUserId,
        )
    }

    override fun addOpportunityToFavorites(
        userId: Long,
        opportunityId: Long,
    ): FavoriteResponse {
        val opportunity = loadOpportunity(opportunityId)

        val favorite = favoriteDao.findByUserIdAndOpportunityId(userId, opportunityId)
            ?: favoriteDao.saveAndFlush(
                FavoriteDto.forOpportunity(
                    userId = userId,
                    opportunityId = opportunityId,
                )
            )

        val employer = loadEmployerProfileSummaryOrNull(opportunity.employerUserId)
        return toOpportunityFavoriteResponse(favorite, opportunity, employer)
    }

    override fun removeOpportunityFromFavorites(
        userId: Long,
        opportunityId: Long,
    ) {
        favoriteDao.deleteByUserIdAndOpportunityId(userId, opportunityId)
    }

    override fun addEmployerToFavorites(
        userId: Long,
        employerUserId: Long,
    ): FavoriteResponse {
        val employer = loadEmployerProfile(employerUserId)

        val favorite = favoriteDao.findByUserIdAndEmployerUserId(userId, employerUserId)
            ?: favoriteDao.saveAndFlush(
                FavoriteDto.forEmployer(
                    userId = userId,
                    employerUserId = employerUserId,
                )
            )

        return toEmployerFavoriteResponse(favorite, employer)
    }

    override fun removeEmployerFromFavorites(
        userId: Long,
        employerUserId: Long,
    ) {
        favoriteDao.deleteByUserIdAndEmployerUserId(userId, employerUserId)
    }

    override fun getUserFavorites(userId: Long): List<FavoriteResponse> {
        val employerCache = mutableMapOf<Long, EmployerProfileSummary>()

        return favoriteDao.findByUserIdOrderByCreatedAtDescIdDesc(userId).map { favorite ->
            favorite.validateTargetConsistency()

            when (favorite.targetType) {
                FavoriteTargetType.OPPORTUNITY -> {
                    val opportunityId = favorite.opportunityId
                        ?: throw IllegalStateException("Избранное по возможности должно содержать opportunityId")

                    val opportunity = loadOpportunity(opportunityId)
                    val employer = opportunity.employerUserId?.let { employerUserId ->
                        employerCache[employerUserId]
                            ?: loadEmployerProfileSummaryOrNull(employerUserId)?.also {
                                employerCache[employerUserId] = it
                            }
                    }

                    toOpportunityFavoriteResponse(favorite, opportunity, employer)
                }

                FavoriteTargetType.EMPLOYER -> {
                    val employerUserId = favorite.employerUserId
                        ?: throw IllegalStateException("Избранное по работодателю должно содержать employerUserId")

                    val employer = employerCache.getOrPut(employerUserId) {
                        loadEmployerProfile(employerUserId)
                    }

                    toEmployerFavoriteResponse(favorite, employer)
                }
            }
        }
    }

    override fun addContact(userId: Long, request: ContactRequest): ContactResponse {
        ensureApplicantApprovedForNetworking(userId)

        if (userId == request.contactUserId) {
            throw InteractionBadRequestException(
                message = "Нельзя добавить самого себя в контакты",
                code = "contact_self_add_forbidden",
            )
        }

        ensureApplicantApprovedForNetworking(request.contactUserId)

        val (low, high) = orderedPair(userId, request.contactUserId)
        val existingContact = contactRepository.findByIdUserLowIdAndIdUserHighId(low, high)

        if (existingContact != null) {
            return handleExistingContactOnCreate(userId, existingContact)
        }

        val contactDto = ContactDto(
            id = ContactDtoId(low, high),
            initiatedByUserId = userId,
        )

        val saved = try {
            contactRepository.saveAndFlush(contactDto)
        } catch (_: DataIntegrityViolationException) {
            val concurrentContact = contactRepository.findByIdUserLowIdAndIdUserHighId(low, high)
                ?: throw InteractionConflictException(
                    message = "Контакт уже существует",
                    code = "contact_already_exists",
                )

            return handleExistingContactOnCreate(userId, concurrentContact)
        }

        return toContactResponse(userId, saved)
    }

    override fun respondContact(
        userId: Long,
        contactUserId: Long,
        status: ContactStatus,
    ): ContactResponse {
        ensureApplicantApprovedForNetworking(userId)

        val (low, high) = orderedPair(userId, contactUserId)

        val contact = contactRepository.findByIdUserLowIdAndIdUserHighId(low, high)
            ?: throw InteractionNotFoundException(
                message = "Запрос в контакты не найден",
                code = "contact_request_not_found",
            )

        if (contact.initiatedByUserId != contactUserId) {
            throw InteractionForbiddenException(
                message = "Ответить на запрос может только получатель",
                code = "contact_request_recipient_required",
            )
        }

        if (contact.status != ContactStatus.PENDING) {
            throw InteractionConflictException(
                message = "На этот запрос уже был дан ответ",
                code = "contact_request_already_resolved",
            )
        }

        contact.status = status
        contact.respondedAt = OffsetDateTime.now()

        val saved = contactRepository.saveAndFlush(contact)
        return toContactResponse(userId, saved)
    }

    override fun removeContact(userId: Long, contactUserId: Long) {
        val (low, high) = orderedPair(userId, contactUserId)

        val contact = contactRepository.findByIdUserLowIdAndIdUserHighId(low, high)
            ?: throw InteractionNotFoundException(
                message = "Контакт не найден",
                code = "contact_not_found",
            )

        contactRepository.delete(contact)
    }

    override fun getUserContacts(userId: Long): List<ContactResponse> {
        ensureApplicantApprovedForNetworking(userId)

        val acceptedContacts = getAcceptedContactDtos(userId)
        val incomingPendingContacts = getIncomingPendingContactDtos(userId)
        val outgoingPendingContacts = getOutgoingPendingContactDtos(userId)

        return (acceptedContacts + incomingPendingContacts + outgoingPendingContacts)
            .map { toContactResponse(userId, it) }
            .sortedWith(
                compareByDescending<ContactResponse> { it.createdAt ?: OffsetDateTime.MIN }
                    .thenByDescending { it.contactUserId }
            )
    }

    override fun createRecommendation(
        userId: Long,
        request: CreateContactRecommendationRequest,
    ): ContactRecommendationResponse {
        if (userId == request.toApplicantUserId) {
            throw InteractionBadRequestException(
                message = "Нельзя рекомендовать возможность самому себе",
                code = "recommendation_self_forbidden",
            )
        }

        val fromApplicant = loadApplicant(userId)
        val toApplicant = loadApplicant(request.toApplicantUserId)

        ensureApplicantApprovedForNetworking(fromApplicant)
        ensureApplicantApprovedForNetworking(toApplicant)
        ensureAcceptedContact(userId, request.toApplicantUserId)

        val opportunity = loadOpportunity(request.opportunityId)
        if (opportunity.status != OpportunityStatus.PUBLISHED) {
            throw InteractionConflictException(
                message = "Рекомендовать можно только опубликованную возможность",
                code = "recommendation_only_published_opportunity_allowed",
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
            throw InteractionConflictException(
                message = "Вы уже рекомендовали эту возможность этому контакту",
                code = "recommendation_already_exists",
            )
        }

        val saved = try {
            contactRecommendationDao.save(
                ContactRecommendationDto(
                    opportunityId = request.opportunityId,
                    fromApplicantUserId = userId,
                    toApplicantUserId = request.toApplicantUserId,
                    message = normalizedMessage,
                )
            )
        } catch (_: DataIntegrityViolationException) {
            throw InteractionConflictException(
                message = "Вы уже рекомендовали эту возможность этому контакту",
                code = "recommendation_already_exists",
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
        ensureApplicantApprovedForNetworking(userId)

        val recommendations = contactRecommendationDao.findByToApplicantUserIdOrderByCreatedAtDescIdDesc(userId)
        return mapRecommendations(recommendations)
    }

    override fun getOutgoingRecommendations(userId: Long): List<ContactRecommendationResponse> {
        ensureApplicantApprovedForNetworking(userId)

        val recommendations = contactRecommendationDao.findByFromApplicantUserIdOrderByCreatedAtDescIdDesc(userId)
        return mapRecommendations(recommendations)
    }

    override fun updateRecommendationStatus(
        userId: Long,
        recommendationId: Long,
        request: UpdateContactRecommendationStatusRequest,
    ): ContactRecommendationResponse {
        ensureApplicantApprovedForNetworking(userId)

        val recommendation = contactRecommendationDao.findByIdAndToApplicantUserId(
            id = recommendationId,
            toApplicantUserId = userId,
        ) ?: throw InteractionNotFoundException(
            message = "Рекомендация не найдена",
            code = "recommendation_not_found",
        )

        if (recommendation.status != request.status) {
            validateRecommendationStatusTransition(
                currentStatus = recommendation.status,
                targetStatus = request.status,
            )

            applyRecommendationStatus(
                recommendation = recommendation,
                targetStatus = request.status,
                changedAt = OffsetDateTime.now(),
            )

            contactRecommendationDao.save(recommendation)
        }

        val opportunity = loadOpportunity(recommendation.opportunityId)
        val fromApplicant = loadApplicant(recommendation.fromApplicantUserId)
        val toApplicant = loadApplicant(recommendation.toApplicantUserId)

        return toContactRecommendationResponse(
            recommendation = recommendation,
            opportunity = opportunity,
            fromApplicant = fromApplicant,
            toApplicant = toApplicant,
        )
    }

    override fun deleteRecommendation(
        userId: Long,
        recommendationId: Long,
    ) {
        loadApplicant(userId)

        val recommendation = contactRecommendationDao.findByIdAndFromApplicantUserId(
            id = recommendationId,
            fromApplicantUserId = userId,
        ) ?: throw InteractionNotFoundException(
            message = "Рекомендация не найдена",
            code = "recommendation_not_found",
        )

        contactRecommendationDao.delete(recommendation)
    }

    private fun mapRecommendations(
        recommendations: List<ContactRecommendationDto>,
    ): List<ContactRecommendationResponse> {
        val applicantCache = mutableMapOf<Long, ContactInfoApplicantProfileDto>()
        val opportunityCache = mutableMapOf<Long, OpportunityCard>()

        return recommendations.map { recommendation ->
            val opportunity = opportunityCache.getOrPut(recommendation.opportunityId) {
                loadOpportunity(recommendation.opportunityId)
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
        } catch (ex: FeignException) {
            when (ex.status()) {
                HttpStatus.NOT_FOUND.value() -> throw InteractionBadRequestException(
                    message = "Файл резюме не найден",
                    code = "resume_file_not_found",
                )

                else -> throw InteractionIntegrationException(
                    message = "Сервис медиафайлов временно недоступен",
                    code = "media_service_unavailable",
                    status = HttpStatus.SERVICE_UNAVAILABLE,
                )
            }
        }

        if (file.ownerUserId != userId) {
            throw InteractionForbiddenException(
                message = "Файл резюме не принадлежит текущему пользователю",
                code = "resume_file_owner_required",
            )
        }

        if (file.kind != FileAssetKind.RESUME) {
            throw InteractionBadRequestException(
                message = "Переданный файл не является резюме",
                code = "resume_file_invalid_kind",
            )
        }

        if (file.status != FileAssetStatus.READY) {
            throw InteractionBadRequestException(
                message = "Файл резюме ещё не готов",
                code = "resume_file_not_ready",
            )
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
            )
        )
    }

    private fun markIncomingRecommendationsAsApplied(
        applicantUserId: Long,
        opportunityId: Long,
    ) {
        val recommendations = contactRecommendationDao.findByOpportunityIdAndToApplicantUserId(
            opportunityId = opportunityId,
            toApplicantUserId = applicantUserId,
        )

        if (recommendations.isEmpty()) {
            return
        }

        val changedAt = OffsetDateTime.now()

        recommendations.forEach { recommendation ->
            if (recommendation.status != ContactRecommendationStatus.APPLIED) {
                applyRecommendationStatus(
                    recommendation = recommendation,
                    targetStatus = ContactRecommendationStatus.APPLIED,
                    changedAt = changedAt,
                )
            }
        }

        contactRecommendationDao.saveAll(recommendations)
    }

    private fun validateRecommendationStatusTransition(
        currentStatus: ContactRecommendationStatus,
        targetStatus: ContactRecommendationStatus,
    ) {
        if (currentStatus == targetStatus) {
            return
        }

        val allowedTargets = when (currentStatus) {
            ContactRecommendationStatus.NEW -> setOf(
                ContactRecommendationStatus.VIEWED,
                ContactRecommendationStatus.INTERESTED,
                ContactRecommendationStatus.APPLIED,
                ContactRecommendationStatus.DECLINED,
            )

            ContactRecommendationStatus.VIEWED -> setOf(
                ContactRecommendationStatus.INTERESTED,
                ContactRecommendationStatus.APPLIED,
                ContactRecommendationStatus.DECLINED,
            )

            ContactRecommendationStatus.INTERESTED -> setOf(
                ContactRecommendationStatus.APPLIED,
                ContactRecommendationStatus.DECLINED,
            )

            ContactRecommendationStatus.APPLIED,
            ContactRecommendationStatus.DECLINED -> emptySet()
        }

        if (targetStatus !in allowedTargets) {
            throw InteractionConflictException(
                message = "Недопустимый переход статуса рекомендации: $currentStatus -> $targetStatus",
                code = "recommendation_status_transition_forbidden",
            )
        }
    }

    private fun applyRecommendationStatus(
        recommendation: ContactRecommendationDto,
        targetStatus: ContactRecommendationStatus,
        changedAt: OffsetDateTime,
    ) {
        recommendation.status = targetStatus

        when (targetStatus) {
            ContactRecommendationStatus.NEW -> {
                recommendation.viewedAt = null
                recommendation.respondedAt = null
            }

            ContactRecommendationStatus.VIEWED -> {
                if (recommendation.viewedAt == null) {
                    recommendation.viewedAt = changedAt
                }
            }

            ContactRecommendationStatus.INTERESTED,
            ContactRecommendationStatus.APPLIED,
            ContactRecommendationStatus.DECLINED -> {
                if (recommendation.viewedAt == null) {
                    recommendation.viewedAt = changedAt
                }
                recommendation.respondedAt = changedAt
            }
        }
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
            throw InteractionForbiddenException(
                message = "Рекомендовать возможности можно только подтверждённым контактам",
                code = "accepted_contact_required",
            )
        }
    }

    private fun ensureApplicantApprovedForNetworking(
        userId: Long,
    ) {
        ensureApplicantApprovedForNetworking(loadApplicant(userId))
    }

    private fun ensureApplicantApprovedForNetworking(
        applicant: ContactInfoApplicantProfileDto,
    ) {
        if (applicant.moderationStatus == ApplicantProfileModerationStatus.APPROVED) {
            return
        }

        throw InteractionForbiddenException(
            message = "Нетворкинг-функции доступны только после одобрения профиля соискателя куратором",
            code = "applicant_networking_requires_approved_profile",
        )
    }

    private fun loadApplicant(
        userId: Long,
    ): ContactInfoApplicantProfileDto {
        return contactInfoApplicantProfileDao.findById(userId)
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Соискатель не найден",
                    code = "applicant_not_found",
                )
            }
    }

    private fun loadOpportunity(
        opportunityId: Long,
    ): OpportunityCard {
        return try {
            opportunityServiceClient.getPublicOpportunity(opportunityId)
        } catch (ex: FeignException) {
            when (ex.status()) {
                HttpStatus.NOT_FOUND.value() -> throw InteractionNotFoundException(
                    message = "Возможность не найдена",
                    code = "opportunity_not_found",
                )

                else -> throw InteractionIntegrationException(
                    message = "Сервис возможностей временно недоступен",
                    code = "opportunity_service_unavailable",
                    status = HttpStatus.SERVICE_UNAVAILABLE,
                )
            }
        }
    }

    private fun loadEmployerProfile(
        employerUserId: Long,
    ): EmployerProfileSummary {
        return try {
            profileServiceClient.getEmployerProfile(employerUserId)
        } catch (ex: FeignException) {
            when (ex.status()) {
                HttpStatus.NOT_FOUND.value() -> throw InteractionNotFoundException(
                    message = "Профиль работодателя не найден",
                    code = "employer_profile_not_found",
                )

                else -> throw InteractionIntegrationException(
                    message = "Сервис профилей временно недоступен",
                    code = "profile_service_unavailable",
                    status = HttpStatus.SERVICE_UNAVAILABLE,
                )
            }
        }
    }

    private fun loadEmployerProfileSummaryOrNull(
        employerUserId: Long?,
    ): EmployerProfileSummary? {
        if (employerUserId == null) {
            return null
        }

        return try {
            profileServiceClient.getEmployerProfile(employerUserId)
        } catch (_: Exception) {
            null
        }
    }

    private fun getAcceptedContactDtos(
        userId: Long,
    ): List<ContactDto> {
        val asLow = contactRepository.findByIdUserLowIdAndStatus(userId, ContactStatus.ACCEPTED)
        val asHigh = contactRepository.findByIdUserHighIdAndStatus(userId, ContactStatus.ACCEPTED)

        return asLow + asHigh
    }

    private fun getIncomingPendingContactDtos(
        userId: Long,
    ): List<ContactDto> {
        val asLow = contactRepository.findByIdUserLowIdAndStatus(userId, ContactStatus.PENDING)
        val asHigh = contactRepository.findByIdUserHighIdAndStatus(userId, ContactStatus.PENDING)

        return (asLow + asHigh)
            .filter { it.initiatedByUserId != userId }
    }

    private fun getOutgoingPendingContactDtos(
        userId: Long,
    ): List<ContactDto> {
        val asLow = contactRepository.findByIdUserLowIdAndStatus(userId, ContactStatus.PENDING)
        val asHigh = contactRepository.findByIdUserHighIdAndStatus(userId, ContactStatus.PENDING)

        return (asLow + asHigh)
            .filter { it.initiatedByUserId == userId }
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

    private fun toOpportunityFavoriteResponse(
        favorite: FavoriteDto,
        opportunity: OpportunityCard,
        employer: EmployerProfileSummary?,
    ): FavoriteResponse {
        return FavoriteResponse(
            targetType = FavoriteTargetType.OPPORTUNITY,
            targetId = opportunity.id,
            title = opportunity.title,
            subtitle = opportunity.companyName.takeIf { it.isNotBlank() },
            logo = employer?.logo,
            createdAt = favorite.createdAt,
        )
    }

    private fun toEmployerFavoriteResponse(
        favorite: FavoriteDto,
        employer: EmployerProfileSummary,
    ): FavoriteResponse {
        return FavoriteResponse(
            targetType = FavoriteTargetType.EMPLOYER,
            targetId = employer.userId,
            title = employerDisplayName(employer),
            subtitle = buildEmployerSubtitle(employer),
            logo = employer.logo,
            createdAt = favorite.createdAt,
        )
    }

    private fun employerDisplayName(
        employer: EmployerProfileSummary,
    ): String {
        return employer.companyName?.takeIf { it.isNotBlank() }
            ?: employer.legalName?.takeIf { it.isNotBlank() }
            ?: "Работодатель #${employer.userId}"
    }

    private fun buildEmployerSubtitle(
        employer: EmployerProfileSummary,
    ): String? {
        val cityName = employer.city?.name ?: employer.location?.city?.name

        return listOfNotNull(
            employer.industry?.takeIf { it.isNotBlank() },
            cityName?.takeIf { it.isNotBlank() },
        ).joinToString(" • ")
            .ifBlank {
                employer.legalName?.takeIf { it.isNotBlank() }.orEmpty()
            }
            .ifBlank { null }
    }

    private fun toContactResponse(
        currentUserId: Long,
        contact: ContactDto,
    ): ContactResponse {
        val contactUserId = resolveContactUserId(currentUserId, contact)

        val userDto = contactInfoApplicantProfileDao.findById(contactUserId)
            .orElseThrow {
                InteractionNotFoundException(
                    message = "Соискатель не найден",
                    code = "applicant_not_found",
                )
            }

        val contactName = fullApplicantName(userDto)

        return ContactResponse(
            contactUserId = contactUserId,
            contactName = contactName,
            status = contact.status,
            direction = resolveContactDirection(currentUserId, contact),
            createdAt = contact.createdAt,
        )
    }

    private fun resolveContactUserId(
        currentUserId: Long,
        contact: ContactDto,
    ): Long {
        return when (currentUserId) {
            contact.id.userLowId -> contact.id.userHighId
            contact.id.userHighId -> contact.id.userLowId
            else -> throw InteractionForbiddenException(
                message = "Текущий пользователь не участвует в этом контакте",
                code = "contact_participant_required",
            )
        }
    }

    private fun resolveContactDirection(
        currentUserId: Long,
        contact: ContactDto,
    ): ContactDirection {
        return when (contact.status) {
            ContactStatus.ACCEPTED -> ContactDirection.CONFIRMED
            ContactStatus.PENDING,
            ContactStatus.DECLINED,
            ContactStatus.BLOCKED -> {
                if (contact.initiatedByUserId == currentUserId) {
                    ContactDirection.OUTGOING
                } else {
                    ContactDirection.INCOMING
                }
            }
        }
    }

    private fun handleExistingContactOnCreate(
        currentUserId: Long,
        existingContact: ContactDto,
    ): ContactResponse {
        return when (existingContact.status) {
            ContactStatus.ACCEPTED -> {
                throw InteractionConflictException(
                    message = "Контакт уже подтверждён",
                    code = "contact_already_exists",
                )
            }

            ContactStatus.PENDING -> {
                if (existingContact.initiatedByUserId == currentUserId) {
                    throw InteractionConflictException(
                        message = "Запрос в контакты уже отправлен",
                        code = "contact_request_already_sent",
                    )
                }

                throw InteractionConflictException(
                    message = "У вас уже есть входящий запрос от этого пользователя",
                    code = "contact_request_already_received",
                )
            }

            ContactStatus.DECLINED -> {
                contactRepository.delete(existingContact)
                contactRepository.flush()

                val recreatedContact = contactRepository.saveAndFlush(
                    ContactDto(
                        id = existingContact.id,
                        initiatedByUserId = currentUserId,
                    )
                )

                toContactResponse(currentUserId, recreatedContact)
            }

            ContactStatus.BLOCKED -> {
                throw InteractionForbiddenException(
                    message = "Повторно отправить запрос этому пользователю нельзя",
                    code = "contact_request_blocked",
                )
            }
        }
    }

    private fun toContactRecommendationResponse(
        recommendation: ContactRecommendationDto,
        opportunity: OpportunityCard,
        fromApplicant: ContactInfoApplicantProfileDto,
        toApplicant: ContactInfoApplicantProfileDto,
    ): ContactRecommendationResponse {
        return ContactRecommendationResponse(
            id = recommendation.id ?: error("Идентификатор рекомендации не должен быть null"),
            opportunityId = recommendation.opportunityId,
            opportunityTitle = opportunity.title,
            opportunityType = opportunity.type,
            companyName = opportunity.companyName,
            fromApplicantUserId = recommendation.fromApplicantUserId,
            fromApplicantName = fullApplicantName(fromApplicant),
            toApplicantUserId = recommendation.toApplicantUserId,
            toApplicantName = fullApplicantName(toApplicant),
            message = recommendation.message,
            status = recommendation.status,
            viewedAt = recommendation.viewedAt,
            respondedAt = recommendation.respondedAt,
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
