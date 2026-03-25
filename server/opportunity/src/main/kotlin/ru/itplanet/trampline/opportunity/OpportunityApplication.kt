package ru.itplanet.trampline.opportunity

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.cloud.openfeign.EnableFeignClients

@EnableFeignClients
@SpringBootApplication
class OpportunityApplication

fun main(args: Array<String>) {
	runApplication<OpportunityApplication>(*args)
}
