package ru.itplanet.trampline.profile.service

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.model.moderation.InternalModerationActionResultResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationApproveRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRejectRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationRequestChangesRequest
import ru.itplanet.trampline.commons.model.profile.ApplicantProfileModerationStatus
import ru.itplanet.trampline.commons.model.profile.EmployerProfileModerationStatus
import ru.itplanet.trampline.profile.converter.EmployerProfileConverter
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.dao.EmployerVerificationDao
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.dao.dto.EmployerVerificationDto
import ru.itplanet.trampline.profile.exception.ProfileBadRequestException
import ru.itplanet.trampline.profile.exception.ProfileConflictException
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.ContactMethod
import ru.itplanet.trampline.profile.model.ProfileLink
import ru.itplanet.trampline.profile.model.enums.ApplicationsVisibility
import ru.itplanet.trampline.profile.model.enums.ContactType
import ru.itplanet.trampline.profile.model.enums.ContactsVisibility
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility
import ru.itplanet.trampline.profile.model.enums.VerificationMethod
import ru.itplanet.trampline.profile.model.enums.VerificationStatus
import java.time.OffsetDateTime

@Service
class InternalProfileModerationService(
    private val applicantProfileDao: ApplicantProfileDao,
    private val employerProfileDao: EmployerProfileDao,
    private val employerVerificationDao: EmployerVerificationDao,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val objectMapper: ObjectMapper,
    private val employerProfileConverter: EmployerProfileConverter,
) {

    @Transactional
    fun approveApplicantProfile(
        userId: Long,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        val profile = applicantProfileDao.findById(userId).orElseThrow {
            notFoundApplicantProfile(userId)
        }

        applyApplicantPatch(profile, request.applyPatch)
        profile.moderationStatus = ApplicantProfileModerationStatus.APPROVED

        return InternalModerationActionResultResponse(affectedUserId = userId)
    }

    @Transactional
    fun rejectApplicantProfile(
        userId: Long,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        throw ProfileConflictException(
            message = "Для профилей соискателей используйте сценарий запроса доработки. Жёсткое отклонение профиля не поддерживается",
            code = "profile_reject_not_supported",
        )
    }

    @Transactional
    fun requestChangesApplicantProfile(
        userId: Long,
        request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        val profile = applicantProfileDao.findById(userId).orElseThrow {
            notFoundApplicantProfile(userId)
        }

        profile.moderationStatus = ApplicantProfileModerationStatus.NEEDS_REVISION

        return InternalModerationActionResultResponse(affectedUserId = userId)
    }

    @Transactional
    fun approveEmployerProfile(
        userId: Long,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        val profile = employerProfileDao.findById(userId).orElseThrow {
            notFoundEmployerProfile(userId)
        }

        applyEmployerPatch(profile, request.applyPatch)
        profile.moderationStatus = EmployerProfileModerationStatus.APPROVED
        profile.approvedPublicSnapshot = buildApprovedEmployerPublicSnapshot(profile)

        return InternalModerationActionResultResponse(affectedUserId = userId)
    }

    @Transactional
    fun rejectEmployerProfile(
        userId: Long,
        request: InternalModerationRejectRequest,
    ): InternalModerationActionResultResponse {
        throw ProfileConflictException(
            message = "Для профилей работодателей используйте сценарий запроса доработки. Жёсткое отклонение профиля не поддерживается",
            code = "profile_reject_not_supported",
        )
    }

    @Transactional
    fun requestChangesEmployerProfile(
        userId: Long,
        request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        val profile = employerProfileDao.findById(userId).orElseThrow {
            notFoundEmployerProfile(userId)
        }

        profile.moderationStatus = EmployerProfileModerationStatus.NEEDS_REVISION

        return InternalModerationActionResultResponse(affectedUserId = userId)
    }

    @Transactional
    fun approveEmployerVerification(
        verificationId: Long,
        request: InternalModerationApproveRequest,
    ): InternalModerationActionResultResponse {
        val verification = employerVerificationDao.findById(verificationId).orElseThrow {
            notFoundEmployerVerification(verificationId)
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
            notFoundEmployerVerification(verificationId)
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

    @Transactional
    fun requestChangesEmployerVerification(
        verificationId: Long,
        request: InternalModerationRequestChangesRequest,
    ): InternalModerationActionResultResponse {
        val verification = employerVerificationDao.findById(verificationId).orElseThrow {
            notFoundEmployerVerification(verificationId)
        }

        return InternalModerationActionResultResponse(affectedUserId = verification.employerUserId)
    }

    private fun applyApplicantPatch(
        profile: ApplicantProfileDto,
        patch: JsonNode,
    ) {
        if (!patch.isObject) return

        textField(patch, "firstName") { profile.firstName = it }
        textField(patch, "lastName") { profile.lastName = it }
        textField(patch, "middleName") { profile.middleName = it }
        textField(patch, "universityName") { profile.universityName = it }
        textField(patch, "facultyName") { profile.facultyName = it }
        textField(patch, "studyProgram") { profile.studyProgram = it }
        textField(patch, "about") { profile.about = it }
        textField(patch, "resumeText") { profile.resumeText = it }

        shortField(patch, "course") { profile.course = it }
        shortField(patch, "graduationYear") { profile.graduationYear = it }

        booleanField(patch, "openToWork") { profile.openToWork = it }
        booleanField(patch, "openToEvents") { profile.openToEvents = it }

        if (patch.has("portfolioLinks")) {
            profile.portfolioLinks = profileLinks(patch.get("portfolioLinks"))
        }

        if (patch.has("contactLinks")) {
            profile.contactLinks = contactMethods(patch.get("contactLinks"))
        }

        enumField<ProfileVisibility>(patch, "profileVisibility") { profile.profileVisibility = it }
        enumField<ResumeVisibility>(patch, "resumeVisibility") { profile.resumeVisibility = it }
        enumField<ApplicationsVisibility>(patch, "applicationsVisibility") { profile.applicationsVisibility = it }
        enumField<ContactsVisibility>(patch, "contactsVisibility") { profile.contactsVisibility = it }

        if (patch.has("cityId")) {
            profile.city = patch.get("cityId")
                .takeUnless { it.isNull }
                ?.longValue()
                ?.let { cityId ->
                    cityDao.findById(cityId).orElseThrow {
                        ProfileNotFoundException(
                            message = "Город с идентификатором $cityId не найден",
                            code = "city_not_found",
                        )
                    }
                }
        }
    }

    private fun applyEmployerPatch(
        profile: EmployerProfileDto,
        patch: JsonNode,
    ) {
        if (!patch.isObject) return

        textField(patch, "companyName") { profile.companyName = it }
        textField(patch, "description") { profile.description = it }
        textField(patch, "industry") { profile.industry = it }
        textField(patch, "websiteUrl") { profile.websiteUrl = it }
        textField(patch, "companySize") { profile.companySize = it }

        shortField(patch, "foundedYear") { profile.foundedYear = it }

        if (patch.has("socialLinks")) {
            profile.socialLinks = profileLinks(patch.get("socialLinks"))
        }

        if (patch.has("publicContacts")) {
            profile.publicContacts = contactMethods(patch.get("publicContacts"))
        }

        if (patch.has("cityId")) {
            profile.city = patch.get("cityId")
                .takeUnless { it.isNull }
                ?.longValue()
                ?.let { cityId ->
                    cityDao.findById(cityId).orElseThrow {
                        ProfileNotFoundException(
                            message = "Город с идентификатором $cityId не найден",
                            code = "city_not_found",
                        )
                    }
                }
        }

        if (patch.has("locationId")) {
            profile.location = patch.get("locationId")
                .takeUnless { it.isNull }
                ?.longValue()
                ?.let { locationId ->
                    locationDao.findById(locationId).orElseThrow {
                        ProfileNotFoundException(
                            message = "Локация с идентификатором $locationId не найдена",
                            code = "location_not_found",
                        )
                    }
                }
        }
    }

    private fun buildApprovedEmployerPublicSnapshot(
        profile: EmployerProfileDto,
    ): JsonNode {
        val publicView = employerProfileConverter.fromDto(profile).copy(
            legalName = null,
            inn = null,
            moderationStatus = EmployerProfileModerationStatus.APPROVED,
            logo = null,
        )

        return objectMapper.valueToTree(publicView)
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
                ?.takeIf { it.isNotEmpty() },
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
                ?.toShort(),
        )
    }

    private fun booleanField(
        patch: JsonNode,
        fieldName: String,
        setter: (Boolean) -> Unit,
    ) {
        if (!patch.hasNonNull(fieldName)) return
        setter(patch.get(fieldName).booleanValue())
    }

    private inline fun <reified E : Enum<E>> enumField(
        patch: JsonNode,
        fieldName: String,
        setter: (E) -> Unit,
    ) {
        if (!patch.hasNonNull(fieldName)) return

        val rawValue = patch.get(fieldName).asText().trim()

        val enumValue = try {
            enumValueOf<E>(rawValue.uppercase())
        } catch (_: IllegalArgumentException) {
            throw ProfileBadRequestException(
                message = "Некорректное значение поля \"$fieldName\"",
                code = "profile_moderation_patch_invalid",
            )
        }

        setter(enumValue)
    }

    private fun listOfStrings(node: JsonNode): List<String> {
        if (node.isNull) return emptyList()
        if (!node.isArray) {
            throw ProfileBadRequestException(
                message = "Поле \"professionalLinks\" должно содержать массив строк",
                code = "profile_moderation_patch_invalid",
            )
        }
        return objectMapper.convertValue(node, object : TypeReference<List<String>>() {})
    }

    private fun profileLinks(node: JsonNode): List<ProfileLink> {
        if (node.isNull || !node.isArray) {
            return emptyList()
        }

        return node.mapNotNull { item ->
            when {
                item.isTextual -> item.asText()
                    .trim()
                    .takeIf { it.isNotEmpty() }
                    ?.let { ProfileLink(url = it) }

                item.isObject -> {
                    val url = item.get("url")
                        ?.takeUnless { it.isNull }
                        ?.asText()
                        ?.trim()
                        ?.takeIf { it.isNotEmpty() }
                        ?: return@mapNotNull null

                    val label = item.get("label")
                        ?.takeUnless { it.isNull }
                        ?.asText()
                        ?.trim()
                        ?.takeIf { it.isNotEmpty() }

                    ProfileLink(
                        label = label,
                        url = url,
                    )
                }

                else -> null
            }
        }
    }

    private fun contactMethods(node: JsonNode): List<ContactMethod> {
        if (node.isNull) {
            return emptyList()
        }

        if (node.isObject) {
            return buildList {
                node.fields().forEach { (typeRaw, valueNode) ->
                    val value = valueNode.asText().trim()
                    if (value.isNotEmpty()) {
                        add(
                            ContactMethod(
                                type = parseContactType(typeRaw),
                                value = value,
                            ),
                        )
                    }
                }
            }
        }

        if (!node.isArray) {
            return emptyList()
        }

        return node.mapNotNull { item ->
            when {
                item.isTextual -> item.asText()
                    .trim()
                    .takeIf { it.isNotEmpty() }
                    ?.let {
                        ContactMethod(
                            type = ContactType.OTHER,
                            value = it,
                        )
                    }

                item.isObject -> {
                    val value = item.get("value")
                        ?.takeUnless { it.isNull }
                        ?.asText()
                        ?.trim()
                        ?.takeIf { it.isNotEmpty() }
                        ?: return@mapNotNull null

                    val type = item.get("type")
                        ?.takeUnless { it.isNull }
                        ?.asText()
                        ?.trim()

                    val label = item.get("label")
                        ?.takeUnless { it.isNull }
                        ?.asText()
                        ?.trim()
                        ?.takeIf { it.isNotEmpty() }

                    ContactMethod(
                        type = parseContactType(type),
                        value = value,
                        label = label,
                    )
                }

                else -> null
            }
        }
    }

    private fun parseContactType(raw: String?): ContactType {
        if (raw.isNullOrBlank()) {
            return ContactType.OTHER
        }

        return try {
            enumValueOf<ContactType>(raw.trim().uppercase())
        } catch (_: IllegalArgumentException) {
            ContactType.OTHER
        }
    }

    private fun notFoundApplicantProfile(userId: Long): ProfileNotFoundException {
        return ProfileNotFoundException(
            message = "Профиль соискателя с идентификатором пользователя $userId не найден",
            code = "applicant_profile_not_found",
        )
    }

    private fun notFoundEmployerProfile(userId: Long): ProfileNotFoundException {
        return ProfileNotFoundException(
            message = "Профиль работодателя с идентификатором пользователя $userId не найден",
            code = "employer_profile_not_found",
        )
    }

    private fun notFoundEmployerVerification(verificationId: Long): ProfileNotFoundException {
        return ProfileNotFoundException(
            message = "Запрос на верификацию с идентификатором $verificationId не найден",
            code = "employer_verification_not_found",
        )
    }
}
