package ru.itplanet.trampline.commons.model

import java.math.BigDecimal

data class Location(
    val id: Long?,
    val cityId: Long?,
    val city: City?,
    val title: String?,
    val addressLine: String,
    val addressLine2: String?,
    val postalCode: String?,
    val latitude: BigDecimal?,
    val longitude: BigDecimal?,
)
