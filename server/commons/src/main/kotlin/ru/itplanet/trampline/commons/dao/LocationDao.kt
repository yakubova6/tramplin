package ru.itplanet.trampline.commons.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.dao.dto.LocationDto

interface LocationDao : JpaRepository<LocationDto, Long> {
}