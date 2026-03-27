package ru.itplanet.trampline.geo.service

import ru.itplanet.trampline.geo.model.NearbyOpportunity

interface GeoService {

    fun findNearbyOpportunities(
        lat: Double,
        lng: Double,
        radiusKm: Double,
        pageNumber: Int,
        pageSize: Int
    ): List<NearbyOpportunity>
}