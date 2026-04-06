package ru.itplanet.trampline.opportunity.service

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.model.OpportunityContactInfo
import ru.itplanet.trampline.commons.model.enums.*
import ru.itplanet.trampline.opportunity.dao.OpportunityDao
import ru.itplanet.trampline.opportunity.dao.TagDao
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkDto
import ru.itplanet.trampline.opportunity.dao.dto.OpportunityResourceLinkId
import ru.itplanet.trampline.opportunity.dao.dto.TagDto
import ru.itplanet.trampline.opportunity.exception.OpportunityNotFoundDomainException
import ru.itplanet.trampline.opportunity.validation.OpportunityDomainValidator
import java.time.LocalDate
import java.time.OffsetDateTime

@Service
class OpportunityDomainPatchService(
    private val opportunityRepository: OpportunityDao,
    private val tagDao: TagDao,
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val objectMapper: ObjectMapper,
    private val validator: OpportunityDomainValidator
) {

    @Transactional
    fun applyPatch(opportunityId: Long, patch: JsonNode): OpportunityDto {
        val existing = opportunityRepository.findById(opportunityId)
            .orElseThrow { NoSuchElementException("Opportunity not found with id $opportunityId") }

        applyChanges(existing, patch)

        validator.validate(existing)

        return opportunityRepository.save(existing)
    }

    private fun applyChanges(opportunity: OpportunityDto, patch: JsonNode) {
        if (!patch.isObject) return

        // Текстовые поля
        textField(patch, "title") { opportunity.title = it ?: opportunity.title }
        textField(patch, "shortDescription") { opportunity.shortDescription = it ?: opportunity.shortDescription }
        textField(patch, "fullDescription") { opportunity.fullDescription = it }
        textField(patch, "requirements") { opportunity.requirements = it }
        textField(patch, "companyName") { opportunity.companyName = it ?: opportunity.companyName }
        textField(patch, "salaryCurrency") { opportunity.salaryCurrency = it ?: opportunity.salaryCurrency }
        textField(patch, "moderationComment") { opportunity.moderationComment = it }

        // Enum поля
        enumField<OpportunityType>(patch, "type") { opportunity.type = it }
        enumField<WorkFormat>(patch, "workFormat") { opportunity.workFormat = it }
        nullableEnumField<EmploymentType>(patch, "employmentType") { opportunity.employmentType = it }
        nullableEnumField<Grade>(patch, "grade") { opportunity.grade = it }
        enumField<OpportunityStatus>(patch, "status") { opportunity.status = it }

        // Числовые поля
        intField(patch, "salaryFrom") { opportunity.salaryFrom = it }
        intField(patch, "salaryTo") { opportunity.salaryTo = it }

        // Дата/время поля
        if (patch.has("publishedAt")) {
            opportunity.publishedAt = patch.get("publishedAt")
                .takeUnless { it.isNull }
                ?.asText()
                ?.let(OffsetDateTime::parse)
        }

        if (patch.has("expiresAt")) {
            opportunity.expiresAt = patch.get("expiresAt")
                .takeUnless { it.isNull }
                ?.asText()
                ?.let(OffsetDateTime::parse)
        }

        if (patch.has("eventDate")) {
            opportunity.eventDate = patch.get("eventDate")
                .takeUnless { it.isNull }
                ?.asText()
                ?.let(LocalDate::parse)
        }

        // Город и локация (с загрузкой связанных сущностей)
        if (patch.has("cityId")) {
            val newCityId = patch.get("cityId")
                .takeUnless { it.isNull }
                ?.longValue()
            if (newCityId != null) {
                opportunity.cityId = newCityId
                opportunity.city = cityDao.findById(newCityId).orElseThrow {
                    OpportunityNotFoundDomainException(
                        message = "Город не найден",
                        code = "city_not_found",
                    )
                }
            } else {
                opportunity.cityId = null
                opportunity.city = null
            }
        }

        if (patch.has("locationId")) {
            val newLocationId = patch.get("locationId")
                .takeUnless { it.isNull }
                ?.longValue()
            if (newLocationId != null) {
                opportunity.locationId = newLocationId
                opportunity.location = locationDao.findById(newLocationId).orElseThrow {
                    OpportunityNotFoundDomainException(
                        message = "Локация не найдена",
                        code = "location_not_found",
                    )
                }
            } else {
                opportunity.locationId = null
                opportunity.location = null
            }
        }

        // Контактная информация
        if (patch.has("contactInfo")) {
            opportunity.contactInfo = patch.get("contactInfo")
                .takeUnless { it.isNull }
                ?.let { objectMapper.treeToValue(it, OpportunityContactInfo::class.java) }
                ?: OpportunityContactInfo()
        }

        // Ссылки и теги
        if (patch.has("resourceLinks")) {
            replaceResourceLinks(opportunity, patch.get("resourceLinks"))
        }

        if (patch.has("tagIds")) {
            replaceTags(opportunity, patch.get("tagIds"))
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

    private fun intField(
        patch: JsonNode,
        fieldName: String,
        setter: (Int?) -> Unit,
    ) {
        if (!patch.has(fieldName)) return
        setter(
            patch.get(fieldName)
                .takeUnless { it.isNull }
                ?.intValue(),
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

    private inline fun <reified E : Enum<E>> nullableEnumField(
        patch: JsonNode,
        fieldName: String,
        setter: (E?) -> Unit,
    ) {
        if (!patch.has(fieldName)) return
        setter(
            patch.get(fieldName)
                .takeUnless { it.isNull }
                ?.asText()
                ?.trim()
                ?.uppercase()
                ?.let { enumValueOf<E>(it) },
        )
    }

    private fun replaceResourceLinks(
        opportunity: OpportunityDto,
        node: JsonNode,
    ) {
        opportunity.resourceLinks.clear()

        if (node.isNull) {
            return
        }

        val items = objectMapper.convertValue(node, object : TypeReference<List<ResourceLinkPatch>>() {})
        items.forEachIndexed { index, item ->
            opportunity.resourceLinks.add(
                OpportunityResourceLinkDto().apply {
                    id = OpportunityResourceLinkId(
                        opportunityId = opportunity.id ?: 0L,
                        sortOrder = index,
                    )
                    this.opportunity = opportunity
                    this.label = item.label
                    this.linkType = item.linkType
                    this.url = item.url
                },
            )
        }
    }

    private fun replaceTags(
        opportunity: OpportunityDto,
        node: JsonNode,
    ) {
        opportunity.tags.clear()

        if (node.isNull) {
            return
        }

        val tagIds = objectMapper.convertValue(node, object : TypeReference<List<Long>>() {})
        if (tagIds.isEmpty()) {
            return
        }

        val tagsById = tagDao.findAllById(tagIds).associateBy { it.id!! }
        val missingIds = tagIds.filterNot(tagsById::containsKey)
        if (missingIds.isNotEmpty()) {
            throw OpportunityNotFoundDomainException(
                message = "Не найдены теги: $missingIds",
                code = "tags_not_found",
            )
        }

        val orderedTags = linkedSetOf<TagDto>()
        tagIds.forEach { tagId ->
            orderedTags += tagsById.getValue(tagId)
        }
        opportunity.tags = orderedTags
    }

    private data class ResourceLinkPatch(
        val label: String,
        val linkType: ResourceLinkType,
        val url: String,
    )

    private companion object {
        private val WHITESPACE_REGEX = "\\s+".toRegex()
    }
}
