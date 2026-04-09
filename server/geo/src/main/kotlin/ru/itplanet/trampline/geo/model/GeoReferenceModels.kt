package ru.itplanet.trampline.geo.model

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.math.BigDecimal

data class AddressSuggestRequest(
    @field:NotBlank(message = "Текст запроса обязателен")
    @field:Size(max = 300, message = "Текст запроса не должен превышать 300 символов")
    val query: String,

    @field:Positive(message = "Идентификатор города должен быть положительным")
    val cityId: Long? = null,
)

data class AddressResolveRequest(
    @field:NotBlank(message = "Полный адрес обязателен")
    @field:Size(max = 500, message = "Полный адрес не должен превышать 500 символов")
    val unrestrictedValue: String,
)

data class AddressSuggestion(
    val value: String,
    val unrestrictedValue: String,
    val cityId: Long?,
    val cityName: String?,
    val regionName: String?,
    val addressLine: String,
    val postalCode: String?,
    val latitude: BigDecimal?,
    val longitude: BigDecimal?,
    val qcGeo: Int?,
    val fiasId: String?,
)

data class AddressResolveResponse(
    val value: String,
    val unrestrictedValue: String,
    val cityId: Long?,
    val cityName: String?,
    val regionName: String?,
    val addressLine: String,
    val postalCode: String?,
    val latitude: BigDecimal?,
    val longitude: BigDecimal?,
    val qcGeo: Int?,
    val fiasId: String?,
    val source: String,
)
