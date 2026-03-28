package ru.itplanet.trampline.opportunity

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication
import org.springframework.cloud.openfeign.EnableFeignClients
import org.springframework.context.annotation.ComponentScan
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import ru.itplanet.trampline.opportunity.config.InternalApiProperties

@EnableFeignClients
@EnableConfigurationProperties(InternalApiProperties::class)
@EnableJpaRepositories(basePackages = ["ru.itplanet.trampline.opportunity", "ru.itplanet.trampline.commons"])
@ComponentScan(basePackages = ["ru.itplanet.trampline.opportunity", "ru.itplanet.trampline.commons"])
@EntityScan(basePackages = ["ru.itplanet.trampline.opportunity", "ru.itplanet.trampline.commons"])
@SpringBootApplication
class OpportunityApplication

fun main(args: Array<String>) {
	runApplication<OpportunityApplication>(*args)
}
