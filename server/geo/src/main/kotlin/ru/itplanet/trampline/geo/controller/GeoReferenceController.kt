package ru.itplanet.trampline.geo.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.model.City
import ru.itplanet.trampline.commons.model.Location
import ru.itplanet.trampline.geo.model.AddressResolveRequest
import ru.itplanet.trampline.geo.model.AddressResolveResponse
import ru.itplanet.trampline.geo.model.AddressSuggestRequest
import ru.itplanet.trampline.geo.model.AddressSuggestion
import ru.itplanet.trampline.geo.service.GeoReferenceService

@Validated
@RestController
@RequestMapping("/api/geo")
class GeoReferenceController(
    private val geoReferenceService: GeoReferenceService,
) {

    @GetMapping("/cities")
    fun searchCities(
        @RequestParam(required = false)
        @Size(max = 120, message = "Поисковая строка не должна превышать 120 символов")
        search: String?,
        @RequestParam(defaultValue = "20")
        @Min(value = 1, message = "Параметр limit должен быть не меньше 1")
        @Max(value = 20, message = "Параметр limit должен быть не больше 20")
        limit: Int,
    ): List<City> {
        return geoReferenceService.searchCities(search, limit)
    }

    @GetMapping("/cities/{id}")
    fun getCity(
        @PathVariable
        @Positive(message = "Идентификатор города должен быть положительным")
        id: Long,
    ): City {
        return geoReferenceService.getCity(id)
    }

    @GetMapping("/locations/{id}")
    fun getLocation(
        @PathVariable
        @Positive(message = "Идентификатор локации должен быть положительным")
        id: Long,
    ): Location {
        return geoReferenceService.getLocation(id)
    }

    @PostMapping("/address/suggest")
    fun suggestAddress(
        @Valid @RequestBody request: AddressSuggestRequest,
    ): List<AddressSuggestion> {
        return geoReferenceService.suggestAddress(
            query = request.query,
            cityId = request.cityId,
        )
    }

    @PostMapping("/address/resolve")
    fun resolveAddress(
        @Valid @RequestBody request: AddressResolveRequest,
    ): AddressResolveResponse {
        return geoReferenceService.resolveAddress(
            unrestrictedValue = request.unrestrictedValue,
        )
    }
}
