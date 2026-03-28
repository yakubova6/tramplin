package ru.itplanet.trampline.opportunity.model.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.itplanet.trampline.commons.model.enums.TagCategory

data class CreateEmployerTagRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    val category: TagCategory,
)
