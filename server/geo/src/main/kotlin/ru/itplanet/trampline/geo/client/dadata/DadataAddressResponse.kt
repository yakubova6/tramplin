package ru.itplanet.trampline.geo.client.dadata

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class DadataAddressResponse(
    val suggestions: List<DadataAddressSuggestion> = emptyList(),
)
