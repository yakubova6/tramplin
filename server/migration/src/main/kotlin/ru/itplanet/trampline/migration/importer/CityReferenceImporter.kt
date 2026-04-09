package ru.itplanet.trampline.migration.importer

import org.apache.commons.csv.CSVFormat
import ru.itplanet.trampline.migration.config.ApplicationConfig
import java.math.BigDecimal
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.sql.Connection
import java.sql.DriverManager
import java.sql.Statement

class CityReferenceImporter(
    private val datasource: ApplicationConfig.Datasource,
) {

    fun run(options: CityImportOptions) {
        val csvPath = resolveCsvPath(options)

        DriverManager.getConnection(
            datasource.url,
            datasource.username,
            datasource.password,
        ).use { connection ->
            connection.autoCommit = false

            try {
                val deactivatedCities = if (options.fullRefresh) {
                    deactivateActiveCities(connection, options.countryCode)
                } else {
                    0
                }

                val deactivatedLocations = if (options.cleanupLegacyLocationsWithoutOwner) {
                    deactivateLegacyLocationsWithoutOwner(connection)
                } else {
                    0
                }

                val importResult = importCitiesFromCsv(
                    connection = connection,
                    csvPath = csvPath,
                    countryCode = options.countryCode,
                    batchSize = options.batchSize,
                )

                connection.commit()

                println(
                    """
                    City reference import completed successfully.
                    CSV source: ${csvPath.toAbsolutePath()}
                    Processed rows: ${importResult.processedRows}
                    Rows without coordinates: ${importResult.rowsWithoutCoordinates}
                    Reactivated/updated cities from source: ${importResult.upsertedRows}
                    Deactivated active RU cities before import: $deactivatedCities
                    Deactivated legacy locations without owner: $deactivatedLocations
                    """.trimIndent(),
                )
            } catch (ex: Exception) {
                connection.rollback()
                throw RuntimeException("City reference import failed", ex)
            }
        }
    }

    private fun resolveCsvPath(
        options: CityImportOptions,
    ): Path {
        options.csvPath?.let {
            val path = Path.of(it)
            require(Files.exists(path)) {
                "CSV-файл не найден: ${path.toAbsolutePath()}"
            }
            return path
        }

        val inputStream = CityReferenceImporter::class.java.classLoader
            .getResourceAsStream(options.resourcePath)
            ?: throw IllegalStateException(
                "Не найден bundled CSV в resources: ${options.resourcePath}",
            )

        val tempFile = Files.createTempFile("trampline-city-import-", ".csv")
        inputStream.use { input ->
            Files.copy(input, tempFile, StandardCopyOption.REPLACE_EXISTING)
        }
        tempFile.toFile().deleteOnExit()

        return tempFile
    }

    private fun deactivateActiveCities(
        connection: Connection,
        countryCode: String,
    ): Int {
        connection.prepareStatement(
            """
            UPDATE city
            SET is_active = FALSE
            WHERE country_code = ?
              AND is_active = TRUE
            """.trimIndent(),
        ).use { statement ->
            statement.setString(1, countryCode)
            return statement.executeUpdate()
        }
    }

    private fun deactivateLegacyLocationsWithoutOwner(
        connection: Connection,
    ): Int {
        connection.prepareStatement(
            """
            UPDATE location
            SET is_active = FALSE
            WHERE owner_employer_user_id IS NULL
              AND is_active = TRUE
            """.trimIndent(),
        ).use { statement ->
            return statement.executeUpdate()
        }
    }

    private fun importCitiesFromCsv(
        connection: Connection,
        csvPath: Path,
        countryCode: String,
        batchSize: Int,
    ): ImportResult {
        val csvFormat = CSVFormat.DEFAULT
            .builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreEmptyLines(true)
            .setTrim(true)
            .build()

        val existingCityIndex = loadExistingCities(connection, countryCode)

        var processedRows = 0
        var rowsWithoutCoordinates = 0
        var upsertedRows = 0

        connection.prepareStatement(UPDATE_BY_ID_SQL).use { updateById ->
            connection.prepareStatement(INSERT_CITY_SQL, Statement.RETURN_GENERATED_KEYS).use { insertCity ->
                val pendingInsertRows = ArrayList<CityCsvRow>(batchSize)

                Files.newBufferedReader(csvPath, StandardCharsets.UTF_8).use { reader ->
                    csvFormat.parse(reader).use { parser ->
                        for (record in parser) {
                            val row = CityCsvRow.fromRecord(record.toMap(), countryCode)

                            if (existingCityIndex.hasPending(row)) {
                                flushInsertBatch(
                                    insertCity = insertCity,
                                    pendingInsertRows = pendingInsertRows,
                                    existingCityIndex = existingCityIndex,
                                )
                            }

                            val existingCity = existingCityIndex.find(row)

                            if (existingCity != null) {
                                updateById.fillForUpdateById(
                                    cityId = existingCity.id,
                                    row = row,
                                )
                                updateById.addBatch()

                                existingCityIndex.register(
                                    existingCity.copy(
                                        fiasId = row.fiasId ?: existingCity.fiasId,
                                        naturalKey = row.naturalKey(),
                                    ),
                                )

                                if (processedRows > 0 && processedRows % batchSize == 0) {
                                    updateById.executeBatch()
                                }
                            } else {
                                insertCity.fillForInsert(row)
                                insertCity.addBatch()
                                pendingInsertRows.add(row)
                                existingCityIndex.registerPending(row)

                                if (pendingInsertRows.size >= batchSize) {
                                    flushInsertBatch(
                                        insertCity = insertCity,
                                        pendingInsertRows = pendingInsertRows,
                                        existingCityIndex = existingCityIndex,
                                    )
                                }
                            }

                            processedRows++
                            upsertedRows++

                            if (row.latitude == null || row.longitude == null) {
                                rowsWithoutCoordinates++
                            }
                        }
                    }
                }

                updateById.executeBatch()

                flushInsertBatch(
                    insertCity = insertCity,
                    pendingInsertRows = pendingInsertRows,
                    existingCityIndex = existingCityIndex,
                )
            }
        }

        return ImportResult(
            processedRows = processedRows,
            rowsWithoutCoordinates = rowsWithoutCoordinates,
            upsertedRows = upsertedRows,
        )
    }

    private fun loadExistingCities(
        connection: Connection,
        countryCode: String,
    ): ExistingCityIndex {
        val index = ExistingCityIndex()

        connection.prepareStatement(SELECT_EXISTING_CITIES_SQL).use { statement ->
            statement.setString(1, countryCode)

            statement.executeQuery().use { resultSet ->
                while (resultSet.next()) {
                    val city = ExistingCity(
                        id = resultSet.getLong("id"),
                        fiasId = resultSet.getString("fias_id")?.trim()?.takeIf { it.isNotEmpty() },
                        naturalKey = NaturalKey(
                            name = resultSet.getString("name"),
                            regionName = resultSet.getString("region_name"),
                            countryCode = resultSet.getString("country_code"),
                        ),
                    )
                    index.register(city)
                }
            }
        }

        return index
    }

    private fun flushInsertBatch(
        insertCity: java.sql.PreparedStatement,
        pendingInsertRows: MutableList<CityCsvRow>,
        existingCityIndex: ExistingCityIndex,
    ) {
        if (pendingInsertRows.isEmpty()) {
            return
        }

        insertCity.executeBatch()

        insertCity.generatedKeys.use { generatedKeys ->
            var index = 0

            while (generatedKeys.next()) {
                val row = pendingInsertRows[index]
                existingCityIndex.register(
                    ExistingCity(
                        id = generatedKeys.getLong(1),
                        fiasId = row.fiasId,
                        naturalKey = row.naturalKey(),
                    ),
                )
                index++
            }

            require(index == pendingInsertRows.size) {
                "Не удалось получить generated keys для всех вставленных городов"
            }
        }

        pendingInsertRows.clear()
        existingCityIndex.clearPending()
    }

    private fun java.sql.PreparedStatement.fillForUpdateById(
        cityId: Long,
        row: CityCsvRow,
    ) {
        setNullableString(1, row.fiasId)
        setString(2, row.name)
        setString(3, row.regionName)
        setString(4, row.countryCode)
        setNullableBigDecimal(5, row.latitude)
        setNullableBigDecimal(6, row.longitude)
        setLong(7, cityId)
    }

    private fun java.sql.PreparedStatement.fillForInsert(
        row: CityCsvRow,
    ) {
        setNullableString(1, row.fiasId)
        setString(2, row.name)
        setString(3, row.regionName)
        setString(4, row.countryCode)
        setNullableBigDecimal(5, row.latitude)
        setNullableBigDecimal(6, row.longitude)
    }

    private fun java.sql.PreparedStatement.setNullableString(
        index: Int,
        value: String?,
    ) {
        if (value == null) {
            setNull(index, java.sql.Types.VARCHAR)
        } else {
            setString(index, value)
        }
    }

    private fun java.sql.PreparedStatement.setNullableBigDecimal(
        index: Int,
        value: BigDecimal?,
    ) {
        if (value == null) {
            setNull(index, java.sql.Types.NUMERIC)
        } else {
            setBigDecimal(index, value)
        }
    }

    private data class ImportResult(
        val processedRows: Int,
        val rowsWithoutCoordinates: Int,
        val upsertedRows: Int,
    )

    private data class CityCsvRow(
        val fiasId: String?,
        val name: String,
        val regionName: String,
        val countryCode: String,
        val latitude: BigDecimal?,
        val longitude: BigDecimal?,
    ) {
        fun naturalKey(): NaturalKey = NaturalKey(
            name = name,
            regionName = regionName,
            countryCode = countryCode,
        )

        companion object {
            fun fromRecord(
                record: Map<String, String>,
                defaultCountryCode: String,
            ): CityCsvRow {
                val city = record["city"].toNormalizedLocalityName()
                val settlement = record["settlement"].toNormalizedLocalityName()
                val address = record["address"]?.trim().orEmpty()

                val name = city
                    ?: settlement
                    ?: extractNameFromAddress(address)
                    ?: throw IllegalArgumentException(
                        "В CSV не удалось определить name по колонкам city/settlement/address",
                    )

                val regionName = buildRegionName(record)

                val fiasId = record["fias_id"]?.trim()?.takeIf { it.isNotEmpty() }

                val latitude = record["geo_lat"].toNullableBigDecimal()
                val longitude = record["geo_lon"].toNullableBigDecimal()

                val normalizedCoordinates = if (latitude == null || longitude == null) {
                    null to null
                } else {
                    latitude to longitude
                }

                return CityCsvRow(
                    fiasId = fiasId,
                    name = name,
                    regionName = regionName,
                    countryCode = defaultCountryCode,
                    latitude = normalizedCoordinates.first,
                    longitude = normalizedCoordinates.second,
                )
            }

            private fun buildRegionName(record: Map<String, String>): String {
                val region = record["region"]?.trim()
                    ?.takeIf { it.isNotEmpty() }
                    ?: throw IllegalArgumentException("В CSV отсутствует обязательное поле region")

                val regionType = record["region_type"]?.trim()
                    ?.takeIf { it.isNotEmpty() }

                return when (regionType) {
                    "Респ" -> "Республика $region"
                    "край" -> "$region край"
                    "обл" -> "$region область"
                    "АО" -> "$region АО"
                    else -> region
                }
            }

            private fun extractNameFromAddress(address: String): String? {
                if (address.isBlank()) {
                    return null
                }

                return address
                    .split(',')
                    .asSequence()
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }
                    .lastOrNull()
                    ?.normalizeLocalityName()
            }

            private fun String?.toNormalizedLocalityName(): String? {
                return this?.normalizeLocalityName()
            }

            private fun String.normalizeLocalityName(): String? {
                val normalized = trim()
                    .replace(LEADING_CITY_PREFIX_REGEX, "")
                    .trim()

                return normalized.takeIf { it.isNotEmpty() }
            }

            private fun String?.toNullableBigDecimal(): BigDecimal? {
                val normalized = this?.trim().takeUnless { it.isNullOrEmpty() } ?: return null
                return normalized.toBigDecimalOrNull()
                    ?: throw IllegalArgumentException("Некорректное числовое значение координаты: $normalized")
            }

            private val LEADING_CITY_PREFIX_REGEX = Regex("""^(г\.?\s+)""")
        }
    }

    private data class NaturalKey(
        val name: String,
        val regionName: String,
        val countryCode: String,
    )

    private data class ExistingCity(
        val id: Long,
        val fiasId: String?,
        val naturalKey: NaturalKey,
    )

    private class ExistingCityIndex {
        private val byFias = HashMap<String, ExistingCity>(2048)
        private val byNaturalKey = HashMap<NaturalKey, ExistingCity>(2048)

        private val pendingFiasIds = HashSet<String>(256)
        private val pendingNaturalKeys = HashSet<NaturalKey>(256)

        fun find(row: CityCsvRow): ExistingCity? {
            val byFiasMatch = row.fiasId?.let { byFias[it] }
            if (byFiasMatch != null) {
                return byFiasMatch
            }

            return byNaturalKey[row.naturalKey()]
        }

        fun register(city: ExistingCity) {
            city.fiasId?.let { byFias[it] = city }
            byNaturalKey[city.naturalKey] = city
        }

        fun registerPending(row: CityCsvRow) {
            row.fiasId?.let { pendingFiasIds += it }
            pendingNaturalKeys += row.naturalKey()
        }

        fun hasPending(row: CityCsvRow): Boolean {
            val hasPendingFias = row.fiasId?.let { it in pendingFiasIds } ?: false
            return hasPendingFias || row.naturalKey() in pendingNaturalKeys
        }

        fun clearPending() {
            pendingFiasIds.clear()
            pendingNaturalKeys.clear()
        }
    }

    private companion object {
        private const val SELECT_EXISTING_CITIES_SQL = """
            SELECT id, fias_id, name, region_name, country_code
            FROM city
            WHERE country_code = ?
        """

        private const val UPDATE_BY_ID_SQL = """
            UPDATE city
            SET
                fias_id = COALESCE(fias_id, ?),
                name = ?,
                region_name = ?,
                country_code = ?,
                latitude = COALESCE(?, latitude),
                longitude = COALESCE(?, longitude),
                is_active = TRUE
            WHERE id = ?
        """

        private const val INSERT_CITY_SQL = """
            INSERT INTO city (
                fias_id,
                name,
                region_name,
                country_code,
                latitude,
                longitude,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, TRUE)
        """
    }
}
