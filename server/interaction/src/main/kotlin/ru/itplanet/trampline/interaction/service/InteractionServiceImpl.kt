package ru.itplanet.trampline.interaction.service

import jakarta.persistence.EntityNotFoundException
import org.apache.coyote.BadRequestException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.enums.OpportunityStatus
import ru.itplanet.trampline.interaction.client.OpportunityServiceClient
import ru.itplanet.trampline.interaction.dao.ContactDao
import ru.itplanet.trampline.interaction.dao.FavoriteDao
import ru.itplanet.trampline.interaction.dao.OpportunityResponseDao
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseRequest
import ru.itplanet.trampline.interaction.model.request.OpportunityResponseStatusUpdateRequest
import ru.itplanet.trampline.interaction.model.response.OpportunityResponseResponse
import org.springframework.security.access.AccessDeniedException
import ru.itplanet.trampline.interaction.dao.ContactInfoApplicantProfileDao
import ru.itplanet.trampline.interaction.dao.dto.*
import ru.itplanet.trampline.interaction.model.request.ContactRequest
import ru.itplanet.trampline.interaction.model.response.ContactResponse
import ru.itplanet.trampline.interaction.model.response.FavoriteResponse
import java.time.OffsetDateTime


@Service
@Transactional
class InteractionServiceImpl(
    private val opportunityResponseDao: OpportunityResponseDao,
    private val favoriteDao: FavoriteDao,
    private val contactRepository: ContactDao,
    private val contactInfoApplicantProfileDao: ContactInfoApplicantProfileDao,
    private val opportunityServiceClient: OpportunityServiceClient
) : InteractionService {

    // ----- Отклики -----
    override fun apply(
        userId: Long,
        request: OpportunityResponseRequest
    ): OpportunityResponseResponse {
        val opportunity = opportunityServiceClient.getPublicOpportunity(request.opportunityId)

        if (opportunityResponseDao.existsByApplicantUserIdAndOpportunityId(userId, request.opportunityId)) {
            throw RuntimeException("You have already applied to this opportunity")
        }

        if (opportunity.status != OpportunityStatus.PUBLISHED) {
            throw BadRequestException("This opportunity is not open for applications")
        }
        val opportunityResponseDto =
            OpportunityResponseDto(userId, request.opportunityId, request.applicantComment)
        val saved = opportunityResponseDao.save(opportunityResponseDto)
        return toOpportunityResponseResponse(saved, opportunity.title)
    }

    override fun updateApplicationStatus(
        applicationId: Long,
        currentUserId: Long,
        request: OpportunityResponseStatusUpdateRequest
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
            val opportunityResponse =
                opportunityServiceClient.getPublicOpportunity(app.opportunityId)
            toOpportunityResponseResponse(app, opportunityResponse.title)
        }
    }

    override fun getOpportunityApplications(
        opportunityId: Long,
        currentUserId: Long
    ): List<OpportunityResponseResponse> {
        val opportunity = opportunityServiceClient.getPublicOpportunity(opportunityId)
        if (opportunity.employerUserId != currentUserId) {
            throw AccessDeniedException("You are not the owner of this opportunity")
        }
        return opportunityResponseDao.findByOpportunityId(opportunityId).map { app ->
            toOpportunityResponseResponse(app, opportunity.title)
        }
    }

    // ----- Избранное -----
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

    // ----- Контакты (нетворкинг) -----
    override fun addContact(userId: Long, request: ContactRequest): ContactResponse {
        if (userId == request.contactUserId) {
            throw BadRequestException("You cannot add yourself as a contact")
        }
        val (low, high) = if (userId < request.contactUserId) userId to request.contactUserId else request.contactUserId to userId
        if (contactRepository.existsByIdUserLowIdAndIdUserHighId(low, high)) {
            throw RuntimeException("Contact already exists")
        }
        // Создаём контакт со статусом PENDING (ожидает подтверждения)
        val contactDtoId = ContactDtoId(low, high)
        val contactDto = ContactDto(contactDtoId, userId)
        val saved = contactRepository.save(contactDto)
        return toContactResponse(userId, saved)
    }

    override fun respondContact(userId: Long, contactUserId: Long, status: ContactStatus): ContactResponse {
        val (low, high) = if (userId < contactUserId) userId to contactUserId else contactUserId to userId
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
        val (low, high) = if (userId < contactUserId) userId to contactUserId else contactUserId to userId

        val contact = contactRepository.findByIdUserLowIdAndIdUserHighId(low, high)
            ?: throw EntityNotFoundException("Contact not found")
        contactRepository.delete(contact)
    }

    override fun getUserContacts(userId: Long): List<ContactResponse> {
        val asLow = contactRepository.findByIdUserLowIdAndStatus(userId, ContactStatus.ACCEPTED)
        val asHigh =
            contactRepository.findByIdUserHighIdAndStatus(userId, ContactStatus.ACCEPTED)
        return (asLow + asHigh).map { toContactResponse(userId, it) }
            .distinctBy { it.contactUserId }
    }

    private fun toOpportunityResponseResponse(oppResp: OpportunityResponseDto, title: String?) =
        OpportunityResponseResponse(
            id = oppResp.id!!,
            opportunityId = oppResp.opportunityId,
            applicantUserId = oppResp.applicantUserId,
            opportunityTitle = title,
            status = oppResp.status,
            employerComment = oppResp.employerComment,
            applicantComment = oppResp.applicantComment,
            createdAt = oppResp.createdAt
        )

    private fun toContactResponse(currentUserId: Long, contact: ContactDto): ContactResponse {
        val contactUserId =
            if (contact.initiatedByUserId == currentUserId && contact.id.userLowId == currentUserId)
                contact.id.userHighId else contact.id.userLowId

        val userDto = contactInfoApplicantProfileDao.findById(contactUserId)
            .orElseThrow { EntityNotFoundException("User $contactUserId not found") }
        val contactName = "${userDto.firstName?:""} ${userDto.middleName?:""} ${userDto.lastName?:""}".trim()
        return ContactResponse(contactUserId, contactName, contact.status, contact.createdAt)
    }
}