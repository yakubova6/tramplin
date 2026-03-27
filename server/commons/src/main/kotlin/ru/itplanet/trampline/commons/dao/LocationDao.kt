package ru.itplanet.trampline.commons.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.dao.dto.LocationDto
import java.util.*

interface LocationDao : JpaRepository<LocationDto, Long> {
    fun findByIdAndIsActiveTrue(id: Long): Optional<LocationDto>
}
