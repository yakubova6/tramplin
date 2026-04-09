package ru.itplanet.trampline.profile.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.commons.dao.dto.LocationDto

interface EmployerLocationDao : JpaRepository<LocationDto, Long> {

    @Query(
        """
        SELECT l
        FROM LocationDto l
        LEFT JOIN FETCH l.city
        WHERE l.ownerEmployerUserId = :employerUserId
          AND l.isActive = true
        ORDER BY l.id DESC
        """
    )
    fun findAllActiveByEmployerUserId(
        @Param("employerUserId") employerUserId: Long,
    ): List<LocationDto>

    fun findAllByOwnerEmployerUserIdAndIsActiveTrue(
        employerUserId: Long,
    ): List<LocationDto>

    @Query(
        """
        SELECT l
        FROM LocationDto l
        LEFT JOIN FETCH l.city
        WHERE l.id = :locationId
          AND l.ownerEmployerUserId = :employerUserId
          AND l.isActive = true
        """
    )
    fun findActiveByIdAndEmployerUserId(
        @Param("locationId") locationId: Long,
        @Param("employerUserId") employerUserId: Long,
    ): LocationDto?
}
