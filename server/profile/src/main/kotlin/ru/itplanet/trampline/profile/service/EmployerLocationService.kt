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
        val title = normalizeOptionalText(request.title)
        val addressLine = normalizeRequiredText(request.addressLine, "Адрес")
        val addressLine2 = normalizeOptionalText(request.addressLine2)
        val postalCode = normalizeOptionalText(request.postalCode)
        val fiasId = normalizeOptionalText(request.fiasId)
        val unrestrictedValue = normalizeOptionalText(request.unrestrictedValue)

        validateCoordinatesPair(request.latitude, request.longitude)
        validateUnrestrictedValueConsistency(
            city = city,
            addressLine = addressLine,
            unrestrictedValue = unrestrictedValue,
        )
        validateUniqueLocation(
            currentUserId = currentUserId,
            currentLocationId = null,
            cityId = requireNotNull(city.id),
            addressLine = addressLine,
            addressLine2 = addressLine2,
            fiasId = fiasId,
            unrestrictedValue = unrestrictedValue,
        )

        val location = LocationDto().apply {
            ownerEmployerUserId = currentUserId
            cityId = requireNotNull(city.id)
            this.city = city
            this.title = title
            this.addressLine = addressLine
            this.addressLine2 = addressLine2
            this.postalCode = postalCode
            latitude = request.latitude
            longitude = request.longitude
            this.fiasId = fiasId
            this.unrestrictedValue = unrestrictedValue
            qcGeo = request.qcGeo?.toShort()
            source = resolveSource(
                fiasId = this.fiasId,
                unrestrictedValue = this.unrestrictedValue,
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

        val resolvedCity = location.city ?: loadActiveCityOrThrow(requireNotNull(location.cityId))
        val resolvedAddressLine = normalizeRequiredText(location.addressLine, "Адрес")

        validateCoordinatesPair(location.latitude, location.longitude)
        validateUnrestrictedValueConsistency(
            city = resolvedCity,
            addressLine = resolvedAddressLine,
            unrestrictedValue = location.unrestrictedValue,
        )
        validateUniqueLocation(
            currentUserId = currentUserId,
            currentLocationId = requireNotNull(location.id),
            cityId = requireNotNull(location.cityId),
            addressLine = resolvedAddressLine,
            addressLine2 = location.addressLine2,
            fiasId = location.fiasId,
            unrestrictedValue = location.unrestrictedValue,
        )

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

    private fun validateUnrestrictedValueConsistency(
        city: CityDto,
        addressLine: String,
        unrestrictedValue: String?,
    ) {
        val normalizedUnrestrictedValue = normalizeOptionalForContains(unrestrictedValue) ?: return
        val normalizedCityName = normalizeForContains(city.name)
        val normalizedAddressLine = normalizeForContains(addressLine)

        if (!normalizedUnrestrictedValue.contains(normalizedCityName)) {
            throw ProfileBadRequestException(
                message = "Полный адрес не соответствует выбранному городу",
                code = "location_unrestricted_value_city_mismatch",
            )
        }

        if (!normalizedUnrestrictedValue.contains(normalizedAddressLine)) {
            throw ProfileBadRequestException(
                message = "Полный адрес не содержит указанный addressLine",
                code = "location_unrestricted_value_address_mismatch",
            )
        }
    }

    private fun validateUniqueLocation(
        currentUserId: Long,
        currentLocationId: Long?,
        cityId: Long,
        addressLine: String,
        addressLine2: String?,
        fiasId: String?,
        unrestrictedValue: String?,
    ) {
        val normalizedFiasId = normalizeOptionalIdentifier(fiasId)
        val normalizedUnrestrictedValue = normalizeOptionalForContains(unrestrictedValue)
        val normalizedAddressLine = normalizeForContains(addressLine)
        val normalizedAddressLine2 = normalizeOptionalForContains(addressLine2)

        val duplicateExists = employerLocationDao
            .findAllByOwnerEmployerUserIdAndIsActiveTrue(currentUserId)
            .asSequence()
            .filter { existing -> currentLocationId == null || existing.id != currentLocationId }
            .any { existing ->
                val sameFiasId = normalizedFiasId != null &&
                        normalizedFiasId == normalizeOptionalIdentifier(existing.fiasId)

                val sameUnrestrictedValue = normalizedUnrestrictedValue != null &&
                        normalizedUnrestrictedValue == normalizeOptionalForContains(existing.unrestrictedValue)

                val sameAddressWithinCity = existing.cityId == cityId &&
                        normalizedAddressLine == normalizeOptionalForContains(existing.addressLine) &&
                        normalizedAddressLine2 == normalizeOptionalForContains(existing.addressLine2)

                sameFiasId || sameUnrestrictedValue || sameAddressWithinCity
            }

        if (duplicateExists) {
            throw ProfileBadRequestException(
                message = "У работодателя уже существует такая активная локация",
                code = "employer_location_duplicate",
            )
        }
    }

    private fun normalizeRequiredText(
        value: String?,
        fieldName: String,
    ): String {
        val normalized = value?.trim().orEmpty()
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

    private fun normalizeForContains(
        value: String,
    ): String {
        return value
            .trim()
            .lowercase()
            .replace(Regex("\\s+"), " ")
    }

    private fun normalizeOptionalForContains(
        value: String?,
    ): String? {
        return value
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.lowercase()
            ?.replace(Regex("\\s+"), " ")
    }

    private fun normalizeOptionalIdentifier(
        value: String?,
    ): String? {
        return value
            ?.trim()
            ?.lowercase()
            ?.takeIf { it.isNotEmpty() }
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
