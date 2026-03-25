package ru.itplanet.trampline.commons.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.model.City

@Component
class CityConverter {

    fun toDto(source: City): CityDto {
        return CityDto(
            name = source.name,
            regionName = source.regionName,
            countryCode = source.countryCode,
            latitude = source.latitude,
            longitude = source.longitude
        )
    }

    fun fromDto(source: CityDto): City {
        return City(
            id = source.id,
            name = source.name,
            regionName = source.regionName,
            countryCode = source.countryCode,
            latitude = source.latitude,
            longitude = source.longitude,
            isActive = source.isActive
        )
    }
}