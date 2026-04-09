package ru.itplanet.trampline.geo.dao

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.commons.dao.dto.CityDto

interface GeoCityQueryDao : JpaRepository<CityDto, Long> {

    @Query(
        """
        SELECT c
        FROM CityDto c
        WHERE c.isActive = true
          AND (
            :search IS NULL
            OR LOWER(c.name) LIKE CONCAT('%', :search, '%')
            OR LOWER(c.regionName) LIKE CONCAT('%', :search, '%')
          )
        ORDER BY
          CASE
            WHEN :search IS NULL THEN 0
            WHEN LOWER(c.name) = :search THEN 0
            WHEN LOWER(c.name) LIKE CONCAT(:search, '%') THEN 1
            WHEN LOWER(c.regionName) LIKE CONCAT(:search, '%') THEN 2
            ELSE 3
          END,
          c.name ASC,
          c.regionName ASC
        """
    )
    fun searchActiveCities(
        @Param("search") search: String?,
        pageable: Pageable,
    ): List<CityDto>

    fun findFirstByFiasIdAndIsActiveTrue(fiasId: String): CityDto?

    fun findFirstByNameIgnoreCaseAndRegionNameIgnoreCaseAndCountryCodeIgnoreCaseAndIsActiveTrue(
        name: String,
        regionName: String,
        countryCode: String,
    ): CityDto?

    fun findFirstByNameIgnoreCaseAndCountryCodeIgnoreCaseAndIsActiveTrue(
        name: String,
        countryCode: String,
    ): CityDto?
}
