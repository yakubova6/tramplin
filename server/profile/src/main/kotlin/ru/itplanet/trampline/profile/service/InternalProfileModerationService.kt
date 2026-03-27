package ru.itplanet.trampline.profile.service

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.model.moderation.InternalModerationActionResultResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationApproveRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRejectRequest
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.dao.EmployerVerificationDao
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.dao.dto.EmployerVerificationDto
import ru.itplanet.trampline.profile.model.enums.VerificationMethod
import ru.itplanet.trampline.profile.model.enums.VerificationStatus
import java.time.OffsetDateTime

@Service
class InternalProfileModerationService(
    private val employerProfileDao: EmployerProfileDao,
    private val employerVerificationDao: EmployerVerificationDao,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val objectMapper: ObjectMapper,
) {

    @Transactional
    fun approveEmployerProfile(
        userId: Long,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        val profile = employerProfileDao.findById(userId).orElseThrow {
            notFound("Employer profile with userId=$userId not found")
        }

        applyEmployerPatch(profile, request.applyPatch)

        return InternalModerationActionResultResponse(affectedUserId = userId)
    }

    @Transactional
    fun rejectEmployerProfile(
        userId: Long,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        employerProfileDao.findById(userId).orElseThrow {
            notFound("Employer profile with userId=$userId not found")
        }

        return InternalModerationActionResultResponse(affectedUserId = userId)
    }

    @Transactional
    fun approveEmployerVerification(
        verificationId: Long,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        val verification = employerVerificationDao.findById(verificationId).orElseThrow {
            notFound("Employer verification with id=$verificationId not found")
        }

        applyEmployerVerificationPatch(verification, request.applyPatch)
        verification.status = VerificationStatus.APPROVED
        verification.reviewComment = request.comment
        verification.reviewedAt = OffsetDateTime.now()
        verification.reviewedByUserId = request.moderatorUserId

        employerProfileDao.findById(verification.employerUserId).orElse(null)?.let { profile ->
            profile.verificationStatus = VerificationStatus.APPROVED
        }

        return InternalModerationActionResultResponse(affectedUserId = verification.employerUserId)
    }

    @Transactional
    fun rejectEmployerVerification(
        verificationId: Long,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        val verification = employerVerificationDao.findById(verificationId).orElseThrow {
            notFound("Employer verification with id=$verificationId not found")
        }

        verification.status = VerificationStatus.REJECTED
        verification.reviewComment = request.comment
        verification.reviewedAt = OffsetDateTime.now()
        verification.reviewedByUserId = request.moderatorUserId

        employerProfileDao.findById(verification.employerUserId).orElse(null)?.let { profile ->
            profile.verificationStatus = VerificationStatus.REJECTED
        }

        return InternalModerationActionResultResponse(affectedUserId = verification.employerUserId)
    }

    private fun applyEmployerPatch(
        profile: EmployerProfileDto,
        patch: JsonNode,
    ) {
        if (!patch.isObject) return

        textField(patch, "companyName") { profile.companyName = it }
        textField(patch, "legalName") { profile.legalName = it }
        textField(patch, "inn") { profile.inn = it }
        textField(patch, "description") { profile.description = it }
        textField(patch, "industry") { profile.industry = it }
        textField(patch, "websiteUrl") { profile.websiteUrl = it }
        textField(patch, "companySize") { profile.companySize = it }

        shortField(patch, "foundedYear") { profile.foundedYear = it }

        if (patch.has("socialLinks")) {
            profile.socialLinks = listOfStrings(patch.get("socialLinks"))
        }

        if (patch.has("publicContacts")) {
            profile.publicContacts = mapOfStrings(patch.get("publicContacts"))
        }

        enumField<VerificationStatus>(patch, "verificationStatus") { profile.verificationStatus = it }

        if (patch.has("cityId")) {
            profile.city = patch.get("cityId")
                .takeUnless { it.isNull }
                ?.longValue()
                ?.let { cityId ->
                    cityDao.findById(cityId).orElseThrow {
                        notFound("City with id=$cityId not found")
                    }
                }
        }

        if (patch.has("locationId")) {
            profile.location = patch.get("locationId")
                .takeUnless { it.isNull }
                ?.longValue()
                ?.let { locationId ->
                    locationDao.findById(locationId).orElseThrow {
                        notFound("Location with id=$locationId not found")
                    }
                }
        }
    }

    private fun applyEmployerVerificationPatch(
        verification: EmployerVerificationDto,
        patch: JsonNode,
    ) {
        if (!patch.isObject) return

        enumField<VerificationMethod>(patch, "verificationMethod") { verification.verificationMethod = it }
        textField(patch, "corporateEmail") { verification.corporateEmail = it }
        textField(patch, "inn") { verification.inn = it }
        textField(patch, "submittedComment") { verification.submittedComment = it }

        if (patch.has("professionalLinks")) {
            verification.professionalLinks = listOfStrings(patch.get("professionalLinks"))
        }
    }

    private fun textField(
        patch: JsonNode,
        fieldName: String,
        setter: (String?) -> Unit,
    ) {
        if (!patch.has(fieldName)) return
        setter(
            patch.get(fieldName)
                .takeUnless { it.isNull }
                ?.asText()
                ?.trim()
                ?.takeIf { it.isNotEmpty() }
        )
    }

    private fun shortField(
        patch: JsonNode,
        fieldName: String,
        setter: (Short?) -> Unit,
    ) {
        if (!patch.has(fieldName)) return
        setter(
            patch.get(fieldName)
                .takeUnless { it.isNull }
                ?.intValue()
                ?.toShort()
        )
    }

    private inline fun <reified E : Enum<E>> enumField(
        patch: JsonNode,
        fieldName: String,
        setter: (E) -> Unit,
    ) {
        if (!patch.hasNonNull(fieldName)) return
        setter(enumValueOf(patch.get(fieldName).asText().trim().uppercase()))
    }

    private fun listOfStrings(node: JsonNode): List<String> {
        if (node.isNull) return emptyList()
        return objectMapper.convertValue(node, object : TypeReference<List<String>>() {})
    }

    private fun mapOfStrings(node: JsonNode): Map<String, String> {
        if (node.isNull) return emptyMap()
        return objectMapper.convertValue(node, object : TypeReference<Map<String, String>>() {})
    }

    private fun notFound(message: String): ResponseStatusException {
        return ResponseStatusException(HttpStatus.NOT_FOUND, message)
    }
}
