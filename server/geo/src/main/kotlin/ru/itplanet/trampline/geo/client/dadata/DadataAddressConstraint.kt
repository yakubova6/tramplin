package ru.itplanet.trampline.geo.client.dadata

import com.fasterxml.jackson.annotation.JsonProperty

data class DadataAddressConstraint(
    val city: String? = null,
    val region: String? = null,
    @JsonProperty("country_iso_code")
    val countryIsoCode: String? = null,
)
