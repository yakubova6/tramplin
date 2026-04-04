package ru.itplanet.trampline.auth.model.request

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.constraints.Size

@JsonIgnoreProperties(ignoreUnknown = true)
data class UpdateCuratorAccessRequest(
    val active: Boolean,

    @field:Size(max = 1000, message = "Reason must not be longer than 1000 characters")
    val reason: String? = null,
)
