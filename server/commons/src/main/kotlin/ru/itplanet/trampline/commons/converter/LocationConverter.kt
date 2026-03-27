package ru.itplanet.trampline.commons.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.dao.dto.LocationDto
import ru.itplanet.trampline.commons.model.Location

@Component
class LocationConverter(
    private val cityConverter: CityConverter
) {

    fun toDto(source: Location): LocationDto {
        return LocationDto(
            cityId = source.cityId,
            city = source.city?.let { cityConverter.toDto(it) },
            title = source.title,
            addressLine = source.addressLine,
            addressLine2 = source.addressLine2,
            postalCode = source.postalCode,
            latitude = source.latitude,
            longitude = source.longitude
        )
    }

    fun fromDto(source: LocationDto): Location {
        return Location(
            id = source.id,
            cityId = source.cityId,
            city = source.city?.let { cityConverter.fromDto(it) },
            title = source.title,
            addressLine = source.addressLine,
            addressLine2 = source.addressLine2,
            postalCode = source.postalCode,
            latitude = source.latitude,
            longitude = source.longitude,
        )
    }
}
