package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.converter.CityConverter
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.dao.dto.LocationDto
import ru.itplanet.trampline.profile.dao.EmployerLocationDao
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.exception.ProfileBadRequestException
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.EmployerLocation
import ru.itplanet.trampline.profile.model.request.CreateEmployerLocationRequest
import ru.itplanet.trampline.profile.model.request.PatchEmployerLocationRequest

@Service
class EmployerLocationService(
    private val employerLocationDao: EmployerLocationDao,
    private val employerProfileDao: EmployerProfileDao,
    private val cityDao: CityDao,
    private val cityConverter: CityConverter,
) {

    @Transactional(readOnly = true)
    fun getMyLocations(currentUserId: Long): List<EmployerLocation> {
        ensureEmployerProfileExists(currentUserId)

        return employerLocationDao.findAllActiveByEmployerUserId(currentUserId)
            .map(::toModel)
    }

    @Transactional
    fun createLocation(
        currentUserId: Long,
        request: CreateEmployerLocationRequest,
    ): EmployerLocation {
        ensureEmployerProfileExists(currentUserId)

        val city = loadActiveCityOrThrow(request.cityId)
        validateCoordinatesPair(request.latitude, request.longitude)

        val location = LocationDto().apply {
            ownerEmployerUserId = currentUserId
            cityId = requireNotNull(city.id)
            this.city = city
            title = normalizeOptionalText(request.title)
            addressLine = normalizeRequiredText(request.addressLine, "Адрес")
            addressLine2 = normalizeOptionalText(request.addressLine2)
            postalCode = normalizeOptionalText(request.postalCode)
            latitude = request.latitude
            longitude = request.longitude
            fiasId = normalizeOptionalText(request.fiasId)
            unrestrictedValue = normalizeOptionalText(request.unrestrictedValue)
            qcGeo = request.qcGeo?.toShort()
            source = resolveSource(
                fiasId = fiasId,
                unrestrictedValue = unrestrictedValue,
                currentSource = null,
            )
            isActive = true
        }

        return toModel(employerLocationDao.save(location))
    }

    @Transactional
    fun patchLocation(
        currentUserId: Long,
        locationId: Long,
        request: PatchEmployerLocationRequest,
    ): EmployerLocation {
        ensureEmployerProfileExists(currentUserId)

        val location = getOwnedActiveLocationOrThrow(currentUserId, locationId)

        request.cityId?.let { cityId ->
            val city = loadActiveCityOrThrow(cityId)
            location.cityId = requireNotNull(city.id)
            location.city = city
        }

        request.title?.let { location.title = normalizeOptionalText(it) }
        request.addressLine?.let { location.addressLine = normalizeRequiredText(it, "Адрес") }
        request.addressLine2?.let { location.addressLine2 = normalizeOptionalText(it) }
        request.postalCode?.let { location.postalCode = normalizeOptionalText(it) }
        request.latitude?.let { location.latitude = it }
        request.longitude?.let { location.longitude = it }
        request.fiasId?.let { location.fiasId = normalizeOptionalText(it) }
        request.unrestrictedValue?.let { location.unrestrictedValue = normalizeOptionalText(it) }
        request.qcGeo?.let { location.qcGeo = it.toShort() }

        validateCoordinatesPair(location.latitude, location.longitude)

        if (
            request.fiasId != null ||
            request.unrestrictedValue != null ||
            location.source.isNullOrBlank()
        ) {
            location.source = resolveSource(
                fiasId = location.fiasId,
                unrestrictedValue = location.unrestrictedValue,
                currentSource = location.source,
            )
        }

        return toModel(employerLocationDao.save(location))
    }

    @Transactional
    fun deleteLocation(
        currentUserId: Long,
        locationId: Long,
    ) {
        ensureEmployerProfileExists(currentUserId)

        val location = getOwnedActiveLocationOrThrow(currentUserId, locationId)
        location.isActive = false
        employerLocationDao.save(location)
    }

    @Transactional(readOnly = true)
    fun getOwnedActiveLocationOrThrow(
        currentUserId: Long,
        locationId: Long,
    ): LocationDto {
        return employerLocationDao.findActiveByIdAndEmployerUserId(locationId, currentUserId)
            ?: throw ProfileNotFoundException(
                message = "Локация работодателя с идентификатором $locationId не найдена",
                code = "employer_location_not_found",
            )
    }

    private fun ensureEmployerProfileExists(
        currentUserId: Long,
    ) {
        if (!employerProfileDao.existsById(currentUserId)) {
            throw ProfileNotFoundException(
                message = "Профиль работодателя не найден",
                code = "employer_profile_not_found",
            )
        }
    }

    private fun loadActiveCityOrThrow(
        cityId: Long,
    ): CityDto {
        return cityDao.findByIdAndIsActiveTrue(cityId)
            .orElseThrow {
                ProfileNotFoundException(
                    message = "Город с идентификатором $cityId не найден",
                    code = "city_not_found",
                )
            }
    }

    private fun toModel(
        source: LocationDto,
    ): EmployerLocation {
        return EmployerLocation(
            id = requireNotNull(source.id),
            cityId = requireNotNull(source.cityId),
            city = source.city?.let(cityConverter::fromDto),
            title = source.title,
            addressLine = source.addressLine,
            addressLine2 = source.addressLine2,
            postalCode = source.postalCode,
            latitude = source.latitude,
            longitude = source.longitude,
            fiasId = source.fiasId,
            unrestrictedValue = source.unrestrictedValue,
            qcGeo = source.qcGeo?.toInt(),
            source = source.source,
            isActive = source.isActive,
        )
    }

    private fun validateCoordinatesPair(
        latitude: java.math.BigDecimal?,
        longitude: java.math.BigDecimal?,
    ) {
        if ((latitude == null) != (longitude == null)) {
            throw ProfileBadRequestException(
                message = "Широта и долгота должны быть заполнены одновременно",
                code = "location_coordinates_pair_required",
            )
        }
    }

    private fun normalizeRequiredText(
        value: String,
        fieldName: String,
    ): String {
        val normalized = value.trim()
        if (normalized.isEmpty()) {
            throw ProfileBadRequestException(
                message = "$fieldName не может быть пустым",
                code = "location_required_text_blank",
            )
        }
        return normalized
    }

    private fun normalizeOptionalText(
        value: String?,
    ): String? {
        return value?.trim()?.takeIf { it.isNotEmpty() }
    }

    private fun resolveSource(
        fiasId: String?,
        unrestrictedValue: String?,
        currentSource: String?,
    ): String {
        return if (!fiasId.isNullOrBlank() || !unrestrictedValue.isNullOrBlank()) {
            SOURCE_DADATA
        } else {
            currentSource ?: SOURCE_MANUAL
        }
    }

    private companion object {
        private const val SOURCE_MANUAL = "MANUAL"
        private const val SOURCE_DADATA = "DADATA"
    }
}
