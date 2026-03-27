package ru.itplanet.trampline.geo.model

import org.locationtech.jts.geom.Point

data class NearbyOpportunity(
    val id: Long?,
    val title: String?,
    val fullDescription: String?,
    val salary: Salary?,
    val type: String?,
    val employer: Employer?,
    val location: Location?,
    val city: City?
)

data class Salary(
    val from: Int?,
    val to: Int?,
    val currency: String?
)

data class Employer(
    val id: Long?,
    val companyName: String?
)

data class Location(
    val id: Long?,
    val addressLine: String?,
    val coordinates: GeoPoint?
)

data class City(
    val id: Long?,
    val name: String?
)

data class GeoPoint(
    val lat: Double?,
    val lng: Double?
) {
    companion object {
        fun fromPoint(point: Point?): GeoPoint? {
            return point?.let { GeoPoint(it.y, it.x) }
        }
    }
}