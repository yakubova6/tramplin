package ru.itplanet.trampline.geo.config

import com.github.benmanes.caffeine.cache.Caffeine
import org.springframework.cache.CacheManager
import org.springframework.cache.caffeine.CaffeineCacheManager
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Duration

@Configuration
class CacheConfig(
    private val geoCacheProperties: GeoCacheProperties,
) {

    @Bean
    fun cacheManager(): CacheManager {
        val cacheManager = CaffeineCacheManager(
            CITIES_CACHE,
            ADDRESS_SUGGEST_CACHE,
            ADDRESS_RESOLVE_CACHE,
        )

        cacheManager.registerCustomCache(
            CITIES_CACHE,
            Caffeine.newBuilder()
                .expireAfterWrite(geoCacheProperties.citiesTtl)
                .maximumSize(500)
                .build(),
        )

        cacheManager.registerCustomCache(
            ADDRESS_SUGGEST_CACHE,
            Caffeine.newBuilder()
                .expireAfterWrite(geoCacheProperties.addressSuggestTtl)
                .maximumSize(2_000)
                .build(),
        )

        cacheManager.registerCustomCache(
            ADDRESS_RESOLVE_CACHE,
            Caffeine.newBuilder()
                .expireAfterWrite(geoCacheProperties.addressResolveTtl)
                .maximumSize(2_000)
                .build(),
        )

        return cacheManager
    }

    companion object {
        const val CITIES_CACHE = "geoCities"
        const val ADDRESS_SUGGEST_CACHE = "geoAddressSuggest"
        const val ADDRESS_RESOLVE_CACHE = "geoAddressResolve"
    }
}
