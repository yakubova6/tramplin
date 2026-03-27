package ru.itplanet.trampline.commons.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.dao.dto.CityDto
import java.util.*

interface CityDao : JpaRepository<CityDto, Long> {
    fun findByIdAndIsActiveTrue(id: Long): Optional<CityDto>
}
