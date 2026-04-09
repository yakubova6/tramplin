package ru.itplanet.trampline.geo

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cloud.openfeign.EnableFeignClients
import org.springframework.context.annotation.ComponentScan
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@EnableCaching
@EnableFeignClients
@EnableJpaRepositories(basePackages = ["ru.itplanet.trampline.geo", "ru.itplanet.trampline.commons"])
@ComponentScan(basePackages = ["ru.itplanet.trampline.geo", "ru.itplanet.trampline.commons"])
@EntityScan(basePackages = ["ru.itplanet.trampline.geo", "ru.itplanet.trampline.commons"])
@SpringBootApplication
class GeoApplication

fun main(args: Array<String>) {
	runApplication<GeoApplication>(*args)
}
