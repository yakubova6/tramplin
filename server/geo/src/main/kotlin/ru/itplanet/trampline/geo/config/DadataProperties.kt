package ru.itplanet.trampline.geo.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "dadata")
data class DadataProperties(
    var url: String = "https://suggestions.dadata.ru",
    var apiKey: String = "",
)
