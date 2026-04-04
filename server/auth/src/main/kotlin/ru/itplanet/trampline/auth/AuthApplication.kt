package ru.itplanet.trampline.auth

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication
import org.springframework.cloud.openfeign.EnableFeignClients
import org.springframework.context.annotation.ComponentScan
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@EnableFeignClients(basePackages = ["ru.itplanet.trampline.auth.client"])
@EntityScan(basePackages = ["ru.itplanet.trampline.auth", "ru.itplanet.trampline.commons"])
@EnableJpaRepositories(basePackages = ["ru.itplanet.trampline.auth", "ru.itplanet.trampline.commons"])
@ComponentScan(basePackages = ["ru.itplanet.trampline.auth", "ru.itplanet.trampline.commons"])
@SpringBootApplication
class AuthApplication

fun main(args: Array<String>) {
	runApplication<AuthApplication>(*args)
}
