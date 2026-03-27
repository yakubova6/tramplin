package ru.itplanet.trampline.geo.service

import org.locationtech.jts.geom.Point
import org.locationtech.jts.io.WKTReader
import org.springframework.context.annotation.Primary
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import ru.itplanet.trampline.geo.dao.OpportunityDao
import ru.itplanet.trampline.geo.model.*

@Primary
@Service
class GeoServiceImpl(
    private val opportunityDao: OpportunityDao
): GeoService {

    override fun findNearbyOpportunities(
        lat: Double,
        lng: Double,
        radiusKm: Double,
        pageNumber: Int,
        pageSize: Int
    ): List<NearbyOpportunity> {
        require(lat in -90.0..90.0 && lng in -180.0..180.0) { "Invalid coordinates" }
        val pageable = PageRequest.of(pageNumber, pageSize)
        val projections = opportunityDao.findWithinRadius(lng, lat, radiusKm, pageable)

        return projections.map { proj ->
            val locationPoint = proj.locationPoint.let { WKTReader().read(it) as? Point }

            NearbyOpportunity(
                id = proj.id,
                title = proj.title,
                fullDescription = proj.fullDescription,
                salary = if (proj.salaryFrom != null || proj.salaryTo != null) {
                    Salary(
                        from = proj.salaryFrom,
                        to = proj.salaryTo,
                        currency = proj.salaryCurrency
                    )
                } else null,
                type = proj.type,
                employer = if (proj.employerUserId != null) {
                    Employer(proj.employerUserId, proj.companyName)
                } else null,
                location = if (proj.locationId != null) {
                    Location(
                        id = proj.locationId,
                        addressLine = proj.addressLine,
                        coordinates = GeoPoint(locationPoint?.y, locationPoint?.x)
                    )
                } else null,
                city = if (proj.cityId != null) {
                    City(proj.cityId, proj.cityName)
                } else null
            )
        }
    }
}