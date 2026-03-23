package ru.itplanet.trampline.migration

import org.flywaydb.core.Flyway
import org.yaml.snakeyaml.Yaml
import ru.itplanet.trampline.migration.config.ApplicationConfig

object MigrationApp {

	@JvmStatic
	fun main(args: Array<String>) {
		val yaml = Yaml()

		try {
			val inputStream = MigrationApp::class.java.classLoader.getResourceAsStream("application.yml")
				?: throw IllegalStateException("application.yml not found")

			inputStream.use {
				val config = yaml.loadAs(it, ApplicationConfig::class.java)
					?: throw IllegalStateException("Failed to parse application.yml")

				val datasource = config.datasource
					?: throw IllegalStateException("Datasource config is missing")

				Flyway.configure()
					.dataSource(datasource.url, datasource.username, datasource.password)
					.locations("classpath:migration")
					.load()
					.migrate()
			}
		} catch (e: Exception) {
			throw RuntimeException("Failed to run migrations", e)
		}
	}
}
