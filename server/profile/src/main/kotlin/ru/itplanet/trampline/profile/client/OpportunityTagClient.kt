package ru.itplanet.trampline.profile.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import ru.itplanet.trampline.commons.model.Tag

@FeignClient(
    name = "profile-opportunity-tag-client",
    url = "\${opportunity.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface OpportunityTagClient {

    @GetMapping("/internal/tags")
    fun getActiveTagsByIds(
        @RequestParam ids: List<Long>,
    ): List<Tag>
}
