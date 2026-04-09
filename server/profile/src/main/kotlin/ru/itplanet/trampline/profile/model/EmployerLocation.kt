package ru.itplanet.trampline.profile.model

import ru.itplanet.trampline.commons.model.City
import java.math.BigDecimal

data class EmployerLocation(
    val id: Long,
    val cityId: Long,
    val city: City?,
    val title: String?,
    val addressLine: String,
    val addressLine2: String?,
    val postalCode: String?,
    val latitude: BigDecimal?,
    val longitude: BigDecimal?,
    val fiasId: String?,
    val unrestrictedValue: String?,
    val qcGeo: Int?,
    val source: String?,
    val isActive: Boolean,
)
