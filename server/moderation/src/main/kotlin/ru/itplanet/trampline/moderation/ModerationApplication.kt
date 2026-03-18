package ru.itplanet.trampline.moderation

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ModerationApplication

fun main(args: Array<String>) {
	runApplication<ModerationApplication>(*args)
}
