package ru.itplanet.trampline.profile.model.request

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.math.BigDecimal

@JsonIgnoreProperties(ignoreUnknown = true)
data class PatchEmployerLocationRequest(
    @field:Size(max = 255, message = "Название локации не должно превышать 255 символов")
    val title: String? = null,

    @field:Positive(message = "Идентификатор города должен быть положительным")
    val cityId: Long? = null,

    @field:Size(max = 255, message = "Адрес не должен превышать 255 символов")
    val addressLine: String? = null,

    @field:Size(max = 255, message = "Дополнительная строка адреса не должна превышать 255 символов")
    val addressLine2: String? = null,

    @field:Size(max = 20, message = "Почтовый индекс не должен превышать 20 символов")
    val postalCode: String? = null,

    @field:DecimalMin(value = "-90.0", message = "Широта должна быть не меньше -90")
    @field:DecimalMax(value = "90.0", message = "Широта должна быть не больше 90")
    val latitude: BigDecimal? = null,

    @field:DecimalMin(value = "-180.0", message = "Долгота должна быть не меньше -180")
    @field:DecimalMax(value = "180.0", message = "Долгота должна быть не больше 180")
    val longitude: BigDecimal? = null,

    @field:Size(max = 36, message = "FIAS ID не должен превышать 36 символов")
    val fiasId: String? = null,

    @field:Size(max = 500, message = "Полный адрес не должен превышать 500 символов")
    val unrestrictedValue: String? = null,

    @field:Min(value = 0, message = "qcGeo не может быть меньше 0")
    @field:Max(value = 5, message = "qcGeo не может быть больше 5")
    val qcGeo: Int? = null,
)
