package ru.itplanet.trampline.migration

import org.yaml.snakeyaml.Yaml
import ru.itplanet.trampline.migration.config.ApplicationConfig
import ru.itplanet.trampline.migration.importer.CityImportOptions
import ru.itplanet.trampline.migration.importer.CityReferenceImporter

object CityReferenceImportApp {

    @JvmStatic
    fun main(args: Array<String>) {
        if (args.any { it == "--help" || it == "-h" }) {
            printUsage()
            return
        }

        val options = try {
            CityImportOptions.fromArgs(args)
        } catch (ex: Exception) {
            throw IllegalArgumentException(
                buildString {
                    appendLine(ex.message ?: "Не удалось прочитать аргументы запуска")
                    appendLine()
                    append(printUsageText())
                },
                ex,
            )
        }

        val config = loadApplicationConfig()
        val datasource = config.datasource
            ?: throw IllegalStateException("Datasource config is missing")

        CityReferenceImporter(datasource).run(options)
    }

    private fun loadApplicationConfig(): ApplicationConfig {
        val yaml = Yaml()
        val inputStream = CityReferenceImportApp::class.java.classLoader.getResourceAsStream("application.yml")
            ?: throw IllegalStateException("application.yml not found")

        inputStream.use {
            return yaml.loadAs(it, ApplicationConfig::class.java)
                ?: throw IllegalStateException("Failed to parse application.yml")
        }
    }

    private fun printUsage() {
        println(printUsageText())
    }

    private fun printUsageText(): String {
        return """
            Импорт мастер-справочника городов в таблицу city.

            По умолчанию используется bundled CSV из resources:
              reference-data/hflabs-city.csv

            Можно переопределить источник:
              --csv=/absolute/or/relative/path/to/hflabs-city.csv

            Необязательные аргументы:
              --resource=reference-data/hflabs-city.csv
              --batch-size=1000
              --full-refresh=true|false
              --cleanup-legacy-locations=true|false
              --country-code=RU

            Ожидаемые колонки CSV:
              city,region,fias_id,geo_lat,geo_lon
            Дополнительно поддерживаются:
              settlement,address,country

            Пример запуска с bundled CSV:
              mvn clean compile exec:java \
                -Dexec.mainClass=ru.itplanet.trampline.migration.CityReferenceImportApp \
                -Dexec.args="--full-refresh=true --cleanup-legacy-locations=true"

            Пример запуска с внешним CSV:
              mvn clean compile exec:java \
                -Dexec.mainClass=ru.itplanet.trampline.migration.CityReferenceImportApp \
                -Dexec.args="--csv=/tmp/hflabs-city.csv --full-refresh=true"
        """.trimIndent()
    }
}
