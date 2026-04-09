package ru.itplanet.trampline.geo.client.dadata

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
data class DadataAddressSuggestion(
    val value: String,
    @JsonProperty("unrestricted_value")
    val unrestrictedValue: String,
    val data: DadataAddressData = DadataAddressData(),
)
