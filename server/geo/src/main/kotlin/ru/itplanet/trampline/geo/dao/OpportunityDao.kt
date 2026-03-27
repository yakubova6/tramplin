package ru.itplanet.trampline.geo.dao

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import ru.itplanet.trampline.geo.dao.dto.GeoOpportunityDto


interface OpportunityDao : JpaRepository<GeoOpportunityDto, Long> {
    @Query(
        value = """SELECT
                o.id,
                o.title,
                o.full_description,
                o.salary_from,
                o.salary_to,
                o.salary_currency,
                o.type,
                ep.user_id AS employer_user_id,
                ep.company_name,
                l.id AS location_id,
                l.address_line as address_line,
                ST_AsText(l.location_point)::text AS location_point,
                c.id AS city_id,
                c.name AS city_name
            FROM opportunity o
            LEFT JOIN employer_profile ep ON o.employer_user_id = ep.user_id
            LEFT JOIN location l ON o.location_id = l.id
            LEFT JOIN city c ON o.city_id = c.id
            WHERE l.location_point IS NOT NULL
              AND o.status = 'PUBLISHED'
              AND ST_DWithin(l.location_point, ST_SetSRID(ST_MakePoint(?1, ?2), 4326)::geography, ?3 * 1000)
            ORDER BY ST_Distance(l.location_point, ST_SetSRID(ST_MakePoint(?1, ?2), 4326)::geography)
        """,
        nativeQuery = true
    )
    fun findWithinRadius(
        lng: Double,
        lat: Double,
        radiusKm: Double,
        pageable: Pageable
    ): List<GeoOpportunityProjection>
}

interface GeoOpportunityProjection {
    val id: Long?
    val title: String?
    val fullDescription: String?
    val salaryFrom: Int?
    val salaryTo: Int?
    val salaryCurrency: String?
    val type: String?
    val employerUserId: Long?
    val companyName: String?
    val locationId: Long?
    val addressLine: String?
    val locationPoint: String?
    val cityId: Long?
    val cityName: String?
}