package ru.itplanet.trampline.moderation

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.cloud.openfeign.EnableFeignClients
import org.springframework.context.annotation.ComponentScan

@EnableFeignClients
@ComponentScan(basePackages = ["ru.itplanet.trampline.moderation", "ru.itplanet.trampline.commons"])
@SpringBootApplication
class ModerationApplication

fun main(args: Array<String>) {
	runApplication<ModerationApplication>(*args)
}
