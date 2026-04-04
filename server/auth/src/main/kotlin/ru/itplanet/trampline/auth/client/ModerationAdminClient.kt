package ru.itplanet.trampline.auth.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import ru.itplanet.trampline.commons.model.moderation.InternalCuratorModerationStatsResponse

@FeignClient(
    name = "auth-moderation-admin-client",
    url = "\${moderation.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface ModerationAdminClient {

    @GetMapping("/internal/moderation/curators/{userId}/stats")
    fun getCuratorStats(
        @PathVariable userId: Long,
    ): InternalCuratorModerationStatsResponse
}
