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
    ): ImportResult {
        val csvFormat = CSVFormat.DEFAULT
            .builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreEmptyLines(true)
            .setTrim(true)
            .build()

        var processedRows = 0
        var rowsWithoutCoordinates = 0
        var upsertedRows = 0

        connection.prepareStatement(UPDATE_BY_FIAS_SQL).use { updateByFias ->
            connection.prepareStatement(UPDATE_BY_NATURAL_KEY_SQL).use { updateByNaturalKey ->
                connection.prepareStatement(INSERT_CITY_SQL).use { insertCity ->
                    Files.newBufferedReader(csvPath, StandardCharsets.UTF_8).use { reader ->
                        csvFormat.parse(reader).use { parser ->
                            for (record in parser) {
                                val row = CityCsvRow.fromRecord(record.toMap(), countryCode)

                                val updatedByFias = if (row.fiasId != null) {
                                    updateByFias.fillForUpdateByFias(row)
                                    updateByFias.executeUpdate()
                                } else {
                                    0
                                }

                                if (updatedByFias == 0) {
                                    updateByNaturalKey.fillForNaturalUpdate(row)
                                    val updatedByNaturalKey = updateByNaturalKey.executeUpdate()

                                    if (updatedByNaturalKey == 0) {
                                        insertCity.fillForInsert(row)
                                        insertCity.executeUpdate()
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
                }
            }
        }

        return ImportResult(
            processedRows = processedRows,
            rowsWithoutCoordinates = rowsWithoutCoordinates,
            upsertedRows = upsertedRows,
        )
    }

    private fun java.sql.PreparedStatement.fillForUpdateByFias(
        row: CityCsvRow,
    ) {
        setString(1, row.name)
        setString(2, row.regionName)
        setString(3, row.countryCode)
        setNullableBigDecimal(4, row.latitude)
        setNullableBigDecimal(5, row.longitude)
        setString(6, row.fiasId)
    }

    private fun java.sql.PreparedStatement.fillForNaturalUpdate(
        row: CityCsvRow,
    ) {
        setNullableString(1, row.fiasId)
        setNullableBigDecimal(2, row.latitude)
        setNullableBigDecimal(3, row.longitude)
        setString(4, row.name)
        setString(5, row.regionName)
        setString(6, row.countryCode)
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
        companion object {
            fun fromRecord(
                record: Map<String, String>,
                defaultCountryCode: String,
            ): CityCsvRow {
                val city = record["city"]?.trim().orEmpty()
                val settlement = record["settlement"]?.trim().orEmpty()
                val address = record["address"]?.trim().orEmpty()

                val name = city
                    .takeIf { it.isNotBlank() }
                    ?: settlement.takeIf { it.isNotBlank() }
                    ?: address.takeIf { it.isNotBlank() }
                    ?: throw IllegalArgumentException("В CSV не удалось определить name по колонкам city/settlement/address")

                val regionName = record["region"]?.trim()
                    ?.takeIf { it.isNotEmpty() }
                    ?: throw IllegalArgumentException("В CSV отсутствует обязательное поле region")

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

            private fun String?.toNullableBigDecimal(): BigDecimal? {
                val normalized = this?.trim().takeUnless { it.isNullOrEmpty() } ?: return null
                return normalized.toBigDecimalOrNull()
                    ?: throw IllegalArgumentException("Некорректное числовое значение координаты: $normalized")
            }
        }
    }

    private companion object {
        private const val UPDATE_BY_FIAS_SQL = """
            UPDATE city
            SET
                name = ?,
                region_name = ?,
                country_code = ?,
                latitude = COALESCE(?, city.latitude),
                longitude = COALESCE(?, city.longitude),
                is_active = TRUE
            WHERE fias_id = ?
        """

        private const val UPDATE_BY_NATURAL_KEY_SQL = """
            UPDATE city
            SET
                fias_id = COALESCE(city.fias_id, ?),
                latitude = COALESCE(?, city.latitude),
                longitude = COALESCE(?, city.longitude),
                is_active = TRUE
            WHERE name = ?
              AND region_name = ?
              AND country_code = ?
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
