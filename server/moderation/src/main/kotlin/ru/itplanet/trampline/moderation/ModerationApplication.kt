package ru.itplanet.trampline.moderation

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.cloud.openfeign.EnableFeignClients

@EnableFeignClients
@SpringBootApplication
class ModerationApplication

fun main(args: Array<String>) {
	runApplication<ModerationApplication>(*args)
}
