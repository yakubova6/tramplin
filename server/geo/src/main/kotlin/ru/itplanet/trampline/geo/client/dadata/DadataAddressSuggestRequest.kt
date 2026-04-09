package ru.itplanet.trampline.geo.client.dadata

import com.fasterxml.jackson.annotation.JsonProperty

data class DadataAddressSuggestRequest(
    val query: String,
    val count: Int? = null,
    val locations: List<DadataAddressConstraint> = emptyList(),
    @JsonProperty("locations_boost")
    val locationsBoost: List<DadataAddressConstraint> = emptyList(),
)
