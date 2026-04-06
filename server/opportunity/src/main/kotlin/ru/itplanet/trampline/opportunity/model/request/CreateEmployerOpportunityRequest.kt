package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.commons.model.enums.EmploymentType
import ru.itplanet.trampline.commons.model.enums.Grade
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import java.time.LocalDate
import java.time.OffsetDateTime

data class CreateEmployerOpportunityRequest(
    @field:NotBlank(message = "Название обязательно")
    @field:Size(max = 200, message = "Название не должно превышать 200 символов")
    val title: String,

    @field:NotBlank(message = "Краткое описание обязательно")
    @field:Size(max = 1000, message = "Краткое описание не должно превышать 1000 символов")
    val shortDescription: String,

    val fullDescription: String? = null,

    val requirements: String? = null,

    val type: OpportunityType,
    val workFormat: WorkFormat,
    val employmentType: EmploymentType? = null,
    val grade: Grade? = null,

    @field:Min(value = 0, message = "Зарплата от не может быть отрицательной")
    val salaryFrom: Int? = null,

    @field:Min(value = 0, message = "Зарплата до не может быть отрицательной")
    val salaryTo: Int? = null,

    @field:NotBlank(message = "Валюта зарплаты обязательна")
    @field:Pattern(regexp = "^[A-Za-z]{3}$", message = "Код валюты должен состоять из 3 латинских букв")
    val salaryCurrency: String = "RUB",

    val expiresAt: OffsetDateTime? = null,
    val eventDate: LocalDate? = null,

    @field:Positive(message = "Идентификатор города должен быть положительным")
    val cityId: Long? = null,

    @field:Positive(message = "Идентификатор локации должен быть положительным")
    val locationId: Long? = null,

    @field:Valid
    val contactInfo: CreateEmployerOpportunityContactInfoRequest = CreateEmployerOpportunityContactInfoRequest(),

    @field:Valid
    val resourceLinks: List<CreateEmployerOpportunityResourceLinkRequest> = emptyList(),

    val tagIds: List<@Positive(message = "Идентификатор тега должен быть положительным") Long> = emptyList(),
)
