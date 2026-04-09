package ru.itplanet.trampline.geo.service

import feign.FeignException
import org.springframework.cache.annotation.Cacheable
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.converter.CityConverter
import ru.itplanet.trampline.commons.converter.LocationConverter
import ru.itplanet.trampline.commons.dao.CityDao
import ru.itplanet.trampline.commons.dao.LocationDao
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.model.City
import ru.itplanet.trampline.commons.model.Location
import ru.itplanet.trampline.geo.client.DadataAddressClient
import ru.itplanet.trampline.geo.client.dadata.DadataAddressConstraint
import ru.itplanet.trampline.geo.client.dadata.DadataAddressData
import ru.itplanet.trampline.geo.client.dadata.DadataAddressSuggestRequest
import ru.itplanet.trampline.geo.client.dadata.DadataAddressSuggestion
import ru.itplanet.trampline.geo.config.CacheConfig
import ru.itplanet.trampline.geo.config.DadataProperties
import ru.itplanet.trampline.geo.dao.GeoCityQueryDao
import ru.itplanet.trampline.geo.exception.GeoIntegrationException
import ru.itplanet.trampline.geo.exception.GeoNotFoundException
import ru.itplanet.trampline.geo.model.AddressResolveResponse
import ru.itplanet.trampline.geo.model.AddressSuggestion
import java.math.BigDecimal

@Service
class GeoReferenceServiceImpl(
    private val cityDao: CityDao,
    private val locationDao: LocationDao,
    private val geoCityQueryDao: GeoCityQueryDao,
    private val cityConverter: CityConverter,
    private val locationConverter: LocationConverter,
    private val dadataAddressClient: DadataAddressClient,
    private val dadataProperties: DadataProperties,
) : GeoReferenceService {

    @Transactional(readOnly = true)
    @Cacheable(
        cacheNames = [CacheConfig.CITIES_CACHE],
        key = "(#search == null ? '' : #search.trim().toLowerCase()) + '|' + #limit",
    )
    override fun searchCities(search: String?, limit: Int): List<City> {
        val normalizedSearch = search
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.lowercase()

        return geoCityQueryDao.searchActiveCities(
            search = normalizedSearch,
            pageable = PageRequest.of(0, limit),
        ).map(cityConverter::fromDto)
    }

    @Transactional(readOnly = true)
    override fun getCity(id: Long): City {
        val city = cityDao.findByIdAndIsActiveTrue(id)
            .orElseThrow {
                GeoNotFoundException(
                    message = "Город с идентификатором $id не найден",
                    code = "city_not_found",
                )
            }

        return cityConverter.fromDto(city)
    }

    @Transactional(readOnly = true)
    override fun getLocation(id: Long): Location {
        val location = locationDao.findByIdAndIsActiveTrue(id)
            .orElseThrow {
                GeoNotFoundException(
                    message = "Локация с идентификатором $id не найдена",
                    code = "location_not_found",
                )
            }

        return locationConverter.fromDto(location)
    }

    @Transactional(readOnly = true)
    @Cacheable(
        cacheNames = [CacheConfig.ADDRESS_SUGGEST_CACHE],
        key = "#query.trim().toLowerCase() + '|' + (#cityId == null ? 0 : #cityId)",
    )
    override fun suggestAddress(query: String, cityId: Long?): List<AddressSuggestion> {
        ensureDadataConfigured()

        val boostedCity = cityId?.let(::loadActiveCity)

        val response = try {
            dadataAddressClient.suggestAddress(
                DadataAddressSuggestRequest(
                    query = query.trim(),
                    count = SUGGEST_COUNT,
                    locationsBoost = boostedCity?.let(::toBoostConstraints) ?: emptyList(),
                ),
            )
        } catch (ex: FeignException) {
            throw GeoIntegrationException(
                message = "Не удалось получить подсказки адреса",
                code = "dadata_address_suggest_failed",
                details = mapOf("status" to ex.status().toString()),
            )
        } catch (ex: Exception) {
            throw GeoIntegrationException(
                message = "Не удалось получить подсказки адреса",
                code = "dadata_address_suggest_failed",
            )
        }

        return response.suggestions
            .map { suggestion -> toAddressSuggestion(suggestion, boostedCity) }
            .distinctBy { it.unrestrictedValue }
    }

    @Transactional(readOnly = true)
    @Cacheable(
        cacheNames = [CacheConfig.ADDRESS_RESOLVE_CACHE],
        key = "#unrestrictedValue.trim().toLowerCase()",
    )
    override fun resolveAddress(unrestrictedValue: String): AddressResolveResponse {
        ensureDadataConfigured()

        val response = try {
            dadataAddressClient.suggestAddress(
                DadataAddressSuggestRequest(
                    query = unrestrictedValue.trim(),
                    count = 1,
                ),
            )
        } catch (ex: FeignException) {
            throw GeoIntegrationException(
                message = "Не удалось нормализовать адрес",
                code = "dadata_address_resolve_failed",
                details = mapOf("status" to ex.status().toString()),
            )
        } catch (ex: Exception) {
            throw GeoIntegrationException(
                message = "Не удалось нормализовать адрес",
                code = "dadata_address_resolve_failed",
            )
        }

        val suggestion = response.suggestions.firstOrNull()
            ?: throw GeoNotFoundException(
                message = "Адрес не найден",
                code = "address_not_found",
            )

        return toAddressResolveResponse(suggestion)
    }

    private fun ensureDadataConfigured() {
        if (dadataProperties.apiKey.isBlank()) {
            throw GeoIntegrationException(
                message = "Сервис подсказок адресов не настроен",
                code = "dadata_not_configured",
            )
        }
    }

    private fun loadActiveCity(cityId: Long): CityDto {
        return cityDao.findByIdAndIsActiveTrue(cityId)
            .orElseThrow {
                GeoNotFoundException(
                    message = "Город с идентификатором $cityId не найден",
                    code = "city_not_found",
                )
            }
    }

    private fun toBoostConstraints(city: CityDto): List<DadataAddressConstraint> {
        return listOf(
            DadataAddressConstraint(
                city = city.name,
                region = city.regionName.takeIf { it.isNotBlank() },
                countryIsoCode = city.countryCode,
            ),
        )
    }

    private fun toAddressSuggestion(
        suggestion: DadataAddressSuggestion,
        boostedCity: CityDto?,
    ): AddressSuggestion {
        val data = suggestion.data
        val localCity = resolveLocalCity(data) ?: boostedCity

        return AddressSuggestion(
            value = suggestion.value,
            unrestrictedValue = suggestion.unrestrictedValue,
            cityId = localCity?.id,
            cityName = localCity?.name ?: resolveDisplayCityName(data),
            regionName = localCity?.regionName ?: data.region,
            addressLine = buildAddressLine(suggestion),
            postalCode = data.postalCode,
            latitude = resolveLatitude(data),
            longitude = resolveLongitude(data),
            qcGeo = data.qcGeo,
            fiasId = resolveAddressFiasId(data),
        )
    }

    private fun toAddressResolveResponse(
        suggestion: DadataAddressSuggestion,
    ): AddressResolveResponse {
        val data = suggestion.data
        val localCity = resolveLocalCity(data)

        return AddressResolveResponse(
            value = suggestion.value,
            unrestrictedValue = suggestion.unrestrictedValue,
            cityId = localCity?.id,
            cityName = localCity?.name ?: resolveDisplayCityName(data),
            regionName = localCity?.regionName ?: data.region,
            addressLine = buildAddressLine(suggestion),
            postalCode = data.postalCode,
            latitude = resolveLatitude(data),
            longitude = resolveLongitude(data),
            qcGeo = data.qcGeo,
            fiasId = resolveAddressFiasId(data),
            source = "DADATA",
        )
    }

    private fun resolveLocalCity(
        data: DadataAddressData,
    ): CityDto? {
        val fiasCandidates = listOfNotNull(
            data.cityFiasId,
            data.settlementFiasId,
            data.regionFiasId,
        )

        fiasCandidates.forEach { fiasId ->
            geoCityQueryDao.findFirstByFiasIdAndIsActiveTrue(fiasId)?.let { return it }
        }

        val countryCode = data.countryIsoCode ?: DEFAULT_COUNTRY_CODE
        val nameCandidates = listOfNotNull(
            data.city?.takeIf { it.isNotBlank() },
            data.settlement?.takeIf { it.isNotBlank() },
            data.region?.takeIf { it.isNotBlank() },
        ).distinct()

        val regionName = data.region?.takeIf { it.isNotBlank() }

        for (name in nameCandidates) {
            if (regionName != null) {
                geoCityQueryDao.findFirstByNameIgnoreCaseAndRegionNameIgnoreCaseAndCountryCodeIgnoreCaseAndIsActiveTrue(
                    name = name,
                    regionName = regionName,
                    countryCode = countryCode,
                )?.let { return it }
            }

            geoCityQueryDao.findFirstByNameIgnoreCaseAndCountryCodeIgnoreCaseAndIsActiveTrue(
                name = name,
                countryCode = countryCode,
            )?.let { return it }
        }

        return null
    }

    private fun resolveDisplayCityName(data: DadataAddressData): String? {
        return data.city
            ?: data.settlement
            ?: data.region
    }

    private fun resolveAddressFiasId(data: DadataAddressData): String? {
        return data.houseFiasId
            ?: data.streetFiasId
            ?: data.settlementFiasId
            ?: data.cityFiasId
            ?: data.regionFiasId
            ?: data.fiasId
    }

    private fun resolveLatitude(data: DadataAddressData): BigDecimal? {
        if (data.qcGeo == QC_GEO_UNKNOWN) {
            return null
        }
        return data.geoLat?.toBigDecimalOrNull()
    }

    private fun resolveLongitude(data: DadataAddressData): BigDecimal? {
        if (data.qcGeo == QC_GEO_UNKNOWN) {
            return null
        }
        return data.geoLon?.toBigDecimalOrNull()
    }

    private fun buildAddressLine(
        suggestion: DadataAddressSuggestion,
    ): String {
        val data = suggestion.data

        val housePart = listOfNotNull(
            data.houseTypeFull ?: data.houseType,
            data.house,
        ).joinToString(" ").trim().takeIf { it.isNotBlank() }

        val blockPart = listOfNotNull(
            data.blockTypeFull ?: data.blockType,
            data.block,
        ).joinToString(" ").trim().takeIf { it.isNotBlank() }

        val primary = listOfNotNull(
            data.streetWithType,
            housePart,
            blockPart,
        )
        if (primary.isNotEmpty()) {
            return primary.joinToString(", ")
        }

        val fallback = listOfNotNull(
            data.settlementWithType,
            housePart,
            blockPart,
        )
        if (fallback.isNotEmpty()) {
            return fallback.joinToString(", ")
        }

        return suggestion.value
    }

    private companion object {
        private const val DEFAULT_COUNTRY_CODE = "RU"
        private const val SUGGEST_COUNT = 10
        private const val QC_GEO_UNKNOWN = 5
    }
}
