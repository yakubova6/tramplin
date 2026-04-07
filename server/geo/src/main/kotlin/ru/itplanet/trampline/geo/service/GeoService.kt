package ru.itplanet.trampline.geo.service

import ru.itplanet.trampline.geo.model.NearbyOpportunityPage
import ru.itplanet.trampline.geo.model.NearbyOpportunitySearchRequest

interface GeoService {

    fun findNearbyOpportunities(
        request: NearbyOpportunitySearchRequest,
    ): NearbyOpportunityPage
}
