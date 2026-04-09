package ru.itplanet.trampline.geo.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties(prefix = "geo.cache")
data class GeoCacheProperties(
    var citiesTtl: Duration = Duration.ofMinutes(10),
    var addressSuggestTtl: Duration = Duration.ofMinutes(2),
    var addressResolveTtl: Duration = Duration.ofMinutes(10),
)
