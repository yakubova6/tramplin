package ru.itplanet.trampline.opportunity.model

data class CitySummary(
    val id: Long,
    val name: String,
    val regionName: String,
    val countryCode: String,
    val latitude: Double?,
    val longitude: Double?
)
