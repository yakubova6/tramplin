package ru.itplanet.trampline.commons.model

import java.math.BigDecimal

data class City(
    val id: Long?,
    val name: String,
    val regionName: String,
    val countryCode: String,
    val latitude: BigDecimal?,
    val longitude: BigDecimal?,
    val isActive: Boolean
)
