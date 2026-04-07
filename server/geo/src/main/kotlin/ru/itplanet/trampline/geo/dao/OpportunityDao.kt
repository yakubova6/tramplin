package ru.itplanet.trampline.geo.dao

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.geo.dao.dto.GeoOpportunityDto

interface OpportunityDao : JpaRepository<GeoOpportunityDto, Long> {

    @Query(
        value = """
            WITH searchable_opportunity AS (
                SELECT
                    o.id,
                    o.title,
                    o.full_description,
                    o.type,
                    o.work_format,
                    o.salary_from,
                    o.salary_to,
                    o.salary_currency,
                    o.employer_user_id,
                    o.company_name,
                    l.id AS location_id,
                    l.address_line,
                    c.id AS city_id,
                    c.name AS city_name,
                    CASE
                        WHEN o.work_format IN ('OFFICE', 'HYBRID') AND l.location_point IS NOT NULL THEN 'LOCATION'
                        WHEN o.work_format IN ('REMOTE', 'ONLINE') AND c.city_point IS NOT NULL THEN 'CITY'
                        ELSE NULL
                    END AS placement_type,
                    CASE
                        WHEN o.work_format IN ('OFFICE', 'HYBRID') AND l.location_point IS NOT NULL THEN l.location_point
                        WHEN o.work_format IN ('REMOTE', 'ONLINE') AND c.city_point IS NOT NULL THEN c.city_point
                        ELSE NULL
                    END AS search_point
                FROM opportunity o
                LEFT JOIN location l
                    ON l.id = o.location_id
                   AND l.is_active = TRUE
                LEFT JOIN city c
                    ON c.id = o.city_id
                   AND c.is_active = TRUE
                WHERE o.status = 'PUBLISHED'
                  AND o.published_at IS NOT NULL
                  AND o.published_at <= CURRENT_TIMESTAMP
                  AND (
                      (
                          o.type <> 'EVENT'
                          AND (o.expires_at IS NULL OR o.expires_at >= CURRENT_TIMESTAMP)
                      )
                      OR
                      (
                          o.type = 'EVENT'
                          AND o.event_date IS NOT NULL
                          AND o.event_date >= CURRENT_DATE
                      )
                  )
            )
            SELECT
                so.id,
                so.title,
                so.full_description,
                so.type,
                so.work_format,
                so.salary_from,
                so.salary_to,
                so.salary_currency,
                so.employer_user_id,
                so.company_name,
                so.location_id,
                so.address_line,
                so.city_id,
                so.city_name,
                so.placement_type,
                ST_Y(so.search_point::geometry) AS point_lat,
                ST_X(so.search_point::geometry) AS point_lng,
                ROUND(
                    ST_Distance(
                        so.search_point,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                    )
                )::bigint AS distance_meters
            FROM searchable_opportunity so
            WHERE so.search_point IS NOT NULL
              AND ST_DWithin(
                    so.search_point,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radiusMeters
              )
            ORDER BY
                ST_Distance(
                    so.search_point,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ),
                so.id
        """,
        countQuery = """
            WITH searchable_opportunity AS (
                SELECT
                    CASE
                        WHEN o.work_format IN ('OFFICE', 'HYBRID') AND l.location_point IS NOT NULL THEN l.location_point
                        WHEN o.work_format IN ('REMOTE', 'ONLINE') AND c.city_point IS NOT NULL THEN c.city_point
                        ELSE NULL
                    END AS search_point
                FROM opportunity o
                LEFT JOIN location l
                    ON l.id = o.location_id
                   AND l.is_active = TRUE
                LEFT JOIN city c
                    ON c.id = o.city_id
                   AND c.is_active = TRUE
                WHERE o.status = 'PUBLISHED'
                  AND o.published_at IS NOT NULL
                  AND o.published_at <= CURRENT_TIMESTAMP
                  AND (
                      (
                          o.type <> 'EVENT'
                          AND (o.expires_at IS NULL OR o.expires_at >= CURRENT_TIMESTAMP)
                      )
                      OR
                      (
                          o.type = 'EVENT'
                          AND o.event_date IS NOT NULL
                          AND o.event_date >= CURRENT_DATE
                      )
                  )
            )
            SELECT COUNT(*)
            FROM searchable_opportunity so
            WHERE so.search_point IS NOT NULL
              AND ST_DWithin(
                    so.search_point,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radiusMeters
              )
        """,
        nativeQuery = true,
    )
    fun findWithinRadius(
        @Param("lng") lng: Double,
        @Param("lat") lat: Double,
        @Param("radiusMeters") radiusMeters: Long,
        pageable: Pageable,
    ): Page<GeoOpportunityProjection>
}

interface GeoOpportunityProjection {
    val id: Long?
    val title: String?
    val fullDescription: String?
    val type: String?
    val workFormat: String?
    val salaryFrom: Int?
    val salaryTo: Int?
    val salaryCurrency: String?
    val employerUserId: Long?
    val companyName: String?
    val locationId: Long?
    val addressLine: String?
    val cityId: Long?
    val cityName: String?
    val placementType: String?
    val pointLat: Double?
    val pointLng: Double?
    val distanceMeters: Long?
}
