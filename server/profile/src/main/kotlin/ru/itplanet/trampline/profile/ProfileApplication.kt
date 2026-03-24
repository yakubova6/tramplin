package ru.itplanet.trampline.profile

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.cloud.openfeign.EnableFeignClients

@EnableFeignClients
@SpringBootApplication
class ProfileApplication

fun main(args: Array<String>) {
	runApplication<ProfileApplication>(*args)
}
