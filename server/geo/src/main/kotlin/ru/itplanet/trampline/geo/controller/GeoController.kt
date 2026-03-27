package ru.itplanet.trampline.geo.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.geo.service.GeoService

@RestController
@RequestMapping("/api/geo/opportunities")
class GeoController(
    private val geoService: GeoService
) {

    @GetMapping("/nearby")
    fun getNearby(
        @RequestParam lat: Double,
        @RequestParam lng: Double,
        @RequestParam(defaultValue = "150") radius: Double,
        @RequestParam(defaultValue = "0") pageNumber: Int,
        @RequestParam(defaultValue = "50") pageSize: Int
    ) = geoService.findNearbyOpportunities(lat, lng, radius, pageNumber, pageSize)
}