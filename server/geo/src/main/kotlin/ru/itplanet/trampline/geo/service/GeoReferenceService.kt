package ru.itplanet.trampline.geo.service

import ru.itplanet.trampline.commons.model.City
import ru.itplanet.trampline.commons.model.Location
import ru.itplanet.trampline.geo.model.AddressResolveResponse
import ru.itplanet.trampline.geo.model.AddressSuggestion

interface GeoReferenceService {

    fun searchCities(search: String?, limit: Int): List<City>

    fun getCity(id: Long): City

    fun getLocation(id: Long): Location

    fun suggestAddress(query: String, cityId: Long?): List<AddressSuggestion>

    fun resolveAddress(unrestrictedValue: String): AddressResolveResponse
}
