package ru.itplanet.trampline.geo.client.dadata

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
data class DadataAddressData(
    @JsonProperty("fias_id")
    val fiasId: String? = null,

    @JsonProperty("postal_code")
    val postalCode: String? = null,

    @JsonProperty("country_iso_code")
    val countryIsoCode: String? = null,

    @JsonProperty("region_fias_id")
    val regionFiasId: String? = null,
    val region: String? = null,
    @JsonProperty("region_with_type")
    val regionWithType: String? = null,

    @JsonProperty("city_fias_id")
    val cityFiasId: String? = null,
    val city: String? = null,
    @JsonProperty("city_with_type")
    val cityWithType: String? = null,

    @JsonProperty("settlement_fias_id")
    val settlementFiasId: String? = null,
    val settlement: String? = null,
    @JsonProperty("settlement_with_type")
    val settlementWithType: String? = null,

    @JsonProperty("street_fias_id")
    val streetFiasId: String? = null,
    @JsonProperty("street_with_type")
    val streetWithType: String? = null,

    @JsonProperty("house_fias_id")
    val houseFiasId: String? = null,
    @JsonProperty("house_type")
    val houseType: String? = null,
    @JsonProperty("house_type_full")
    val houseTypeFull: String? = null,
    val house: String? = null,

    @JsonProperty("block_type")
    val blockType: String? = null,
    @JsonProperty("block_type_full")
    val blockTypeFull: String? = null,
    val block: String? = null,

    @JsonProperty("geo_lat")
    val geoLat: String? = null,
    @JsonProperty("geo_lon")
    val geoLon: String? = null,

    @JsonProperty("qc_geo")
    val qcGeo: Int? = null,
)
