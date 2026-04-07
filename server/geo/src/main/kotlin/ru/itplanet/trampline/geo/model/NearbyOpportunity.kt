package ru.itplanet.trampline.geo.model

import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat

data class NearbyOpportunitySearchRequest(
    val lat: Double,
    val lng: Double,
    val radiusMeters: Long = DEFAULT_RADIUS_METERS,
    val pageNumber: Int = 1,
    val pageSize: Int = 20,
) {
    companion object {
        const val DEFAULT_RADIUS_METERS: Long = 150_000
        const val MAX_RADIUS_METERS: Long = 1_000_000
        const val MAX_PAGE_SIZE: Int = 100
    }
}

data class NearbyOpportunityPage(
    val items: List<NearbyOpportunity>,
    val pageNumber: Int,
    val pageSize: Int,
    val total: Long,
)

data class NearbyOpportunity(
    val id: Long,
    val title: String,
    val fullDescription: String?,
    val type: OpportunityType,
    val workFormat: WorkFormat,
    val salary: Salary?,
    val employer: Employer?,
    val location: Location?,
    val city: City?,
    val placementType: GeoPlacementType,
    val point: GeoPoint,
    val distanceMeters: Long,
)

enum class GeoPlacementType {
    LOCATION,
    CITY,
}

data class Salary(
    val from: Int?,
    val to: Int?,
    val currency: String?,
)

data class Employer(
    val id: Long?,
    val companyName: String?,
)

data class Location(
    val id: Long,
    val addressLine: String?,
    val coordinates: GeoPoint?,
)

data class City(
    val id: Long,
    val name: String?,
)

data class GeoPoint(
    val lat: Double,
    val lng: Double,
)
