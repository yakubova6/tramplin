package ru.itplanet.trampline.geo.service

import org.springframework.context.annotation.Primary
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import ru.itplanet.trampline.commons.model.enums.OpportunityType
import ru.itplanet.trampline.commons.model.enums.WorkFormat
import ru.itplanet.trampline.geo.dao.OpportunityDao
import ru.itplanet.trampline.geo.dao.GeoOpportunityProjection
import ru.itplanet.trampline.geo.exception.GeoBadRequestException
import ru.itplanet.trampline.geo.model.City
import ru.itplanet.trampline.geo.model.Employer
import ru.itplanet.trampline.geo.model.GeoPlacementType
import ru.itplanet.trampline.geo.model.GeoPoint
import ru.itplanet.trampline.geo.model.Location
import ru.itplanet.trampline.geo.model.NearbyOpportunity
import ru.itplanet.trampline.geo.model.NearbyOpportunityPage
import ru.itplanet.trampline.geo.model.NearbyOpportunitySearchRequest
import ru.itplanet.trampline.geo.model.Salary

@Primary
@Service
class GeoServiceImpl(
    private val opportunityDao: OpportunityDao,
) : GeoService {

    override fun findNearbyOpportunities(
        request: NearbyOpportunitySearchRequest,
    ): NearbyOpportunityPage {
        validateRequest(request)

        val pageable = PageRequest.of(request.pageNumber - 1, request.pageSize)
        val page = opportunityDao.findWithinRadius(
            lng = request.lng,
            lat = request.lat,
            radiusMeters = request.radiusMeters,
            pageable = pageable,
        )

        return NearbyOpportunityPage(
            items = page.content.map(::toModel),
            pageNumber = request.pageNumber,
            pageSize = request.pageSize,
            total = page.totalElements,
        )
    }

    private fun validateRequest(
        request: NearbyOpportunitySearchRequest,
    ) {
        if (request.lat !in -90.0..90.0 || request.lng !in -180.0..180.0) {
            throw GeoBadRequestException(
                message = "Координаты указаны некорректно",
                code = "invalid_coordinates",
                details = mapOf(
                    "lat" to request.lat.toString(),
                    "lng" to request.lng.toString(),
                ),
            )
        }

        if (request.radiusMeters <= 0L) {
            throw GeoBadRequestException(
                message = "Радиус поиска должен быть больше нуля",
                code = "invalid_radius",
                details = mapOf("radiusMeters" to request.radiusMeters.toString()),
            )
        }

        if (request.radiusMeters > NearbyOpportunitySearchRequest.MAX_RADIUS_METERS) {
            throw GeoBadRequestException(
                message = "Радиус поиска слишком большой",
                code = "radius_too_large",
                details = mapOf(
                    "radiusMeters" to request.radiusMeters.toString(),
                    "maxRadiusMeters" to NearbyOpportunitySearchRequest.MAX_RADIUS_METERS.toString(),
                ),
            )
        }

        if (request.pageNumber < 1) {
            throw GeoBadRequestException(
                message = "Номер страницы должен быть больше нуля",
                code = "invalid_page_number",
                details = mapOf("pageNumber" to request.pageNumber.toString()),
            )
        }

        if (request.pageSize !in 1..NearbyOpportunitySearchRequest.MAX_PAGE_SIZE) {
            throw GeoBadRequestException(
                message = "Размер страницы должен быть в допустимом диапазоне",
                code = "invalid_page_size",
                details = mapOf(
                    "pageSize" to request.pageSize.toString(),
                    "maxPageSize" to NearbyOpportunitySearchRequest.MAX_PAGE_SIZE.toString(),
                ),
            )
        }
    }

    private fun toModel(
        projection: GeoOpportunityProjection,
    ): NearbyOpportunity {
        val placementType = GeoPlacementType.valueOf(requireNotNull(projection.placementType))
        val point = GeoPoint(
            lat = requireNotNull(projection.pointLat),
            lng = requireNotNull(projection.pointLng),
        )

        return NearbyOpportunity(
            id = requireNotNull(projection.id),
            title = requireNotNull(projection.title),
            fullDescription = projection.fullDescription,
            type = OpportunityType.valueOf(requireNotNull(projection.type)),
            workFormat = WorkFormat.valueOf(requireNotNull(projection.workFormat)),
            salary = if (projection.salaryFrom != null || projection.salaryTo != null) {
                Salary(
                    from = projection.salaryFrom,
                    to = projection.salaryTo,
                    currency = projection.salaryCurrency,
                )
            } else {
                null
            },
            employer = Employer(
                id = projection.employerUserId,
                companyName = projection.companyName,
            ),
            location = projection.locationId?.let {
                Location(
                    id = it,
                    addressLine = projection.addressLine,
                    coordinates = if (placementType == GeoPlacementType.LOCATION) point else null,
                )
            },
            city = projection.cityId?.let {
                City(
                    id = it,
                    name = projection.cityName,
                )
            },
            placementType = placementType,
            point = point,
            distanceMeters = requireNotNull(projection.distanceMeters),
        )
    }
}
