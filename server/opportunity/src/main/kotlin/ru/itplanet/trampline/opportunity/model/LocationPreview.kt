package ru.itplanet.trampline.opportunity.model

data class LocationPreview(
    val id: Long,
    val title: String?,
    val addressLine: String,
    val addressLine2: String?,
    val postalCode: String?,
    val latitude: Double?,
    val longitude: Double?
)
