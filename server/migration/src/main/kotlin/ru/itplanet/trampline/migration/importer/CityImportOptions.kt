package ru.itplanet.trampline.migration.importer

data class CityImportOptions(
    val csvPath: String? = null,
    val resourcePath: String = DEFAULT_RESOURCE_PATH,
    val batchSize: Int = DEFAULT_BATCH_SIZE,
    val fullRefresh: Boolean = true,
    val cleanupLegacyLocationsWithoutOwner: Boolean = false,
    val countryCode: String = DEFAULT_COUNTRY_CODE,
) {

    init {
        require(batchSize > 0) {
            "batch-size должен быть больше 0"
        }
        require(countryCode.length == 2) {
            "country-code должен состоять из 2 символов"
        }
        require(resourcePath.isNotBlank()) {
            "resource path не должен быть пустым"
        }
    }

    companion object {
        private const val DEFAULT_BATCH_SIZE = 1000
        private const val DEFAULT_COUNTRY_CODE = "RU"
        private const val DEFAULT_RESOURCE_PATH = "reference-data/hflabs-city.csv"

        fun fromArgs(args: Array<String>): CityImportOptions {
            val values = args.associate { raw ->
                require(raw.startsWith("--") && raw.contains("=")) {
                    "Некорректный аргумент: $raw. Ожидается формат --key=value"
                }

                val withoutPrefix = raw.removePrefix("--")
                val separatorIndex = withoutPrefix.indexOf('=')
                val key = withoutPrefix.substring(0, separatorIndex)
                val value = withoutPrefix.substring(separatorIndex + 1)
                key to value
            }

            return CityImportOptions(
                csvPath = values["csv"]?.takeIf { it.isNotBlank() },
                resourcePath = values["resource"]?.takeIf { it.isNotBlank() } ?: DEFAULT_RESOURCE_PATH,
                batchSize = values["batch-size"]?.toIntOrNull() ?: DEFAULT_BATCH_SIZE,
                fullRefresh = values["full-refresh"]?.toBooleanStrictOrNull() ?: true,
                cleanupLegacyLocationsWithoutOwner = values["cleanup-legacy-locations"]?.toBooleanStrictOrNull() ?: false,
                countryCode = values["country-code"]?.uppercase() ?: DEFAULT_COUNTRY_CODE,
            )
        }
    }
}
