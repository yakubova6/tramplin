package ru.itplanet.trampline.profile.model.request

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.constraints.Size

@JsonIgnoreProperties(ignoreUnknown = true)
data class EmployerProfilePatchRequest(
    val companyName: String? = null,
    val legalName: String? = null,
    @field:Size(min = 10, max = 12)
    val inn: String? = null,
    val description: String? = null,
    val industry: String? = null,
    val websiteUrl: String? = null,
    val socialLinks: List<String>? = null,
    val publicContacts: Map<String, String>? = null,
    val companySize: String? = null,
    val foundedYear: Short? = null,
    val cityId: Long? = null,
    val locationId: Long? = null,
)