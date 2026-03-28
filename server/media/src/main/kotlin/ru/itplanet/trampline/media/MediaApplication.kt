package ru.itplanet.trampline.media

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication
import org.springframework.context.annotation.ComponentScan
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.scheduling.annotation.EnableScheduling

@EntityScan(basePackages = ["ru.itplanet.trampline.media", "ru.itplanet.trampline.commons"])
@EnableJpaRepositories(basePackages = ["ru.itplanet.trampline.media", "ru.itplanet.trampline.commons"])
@ComponentScan(basePackages = ["ru.itplanet.trampline.media", "ru.itplanet.trampline.commons"])
@EnableScheduling
@SpringBootApplication
class MediaApplication

fun main(args: Array<String>) {
	runApplication<MediaApplication>(*args)
}
