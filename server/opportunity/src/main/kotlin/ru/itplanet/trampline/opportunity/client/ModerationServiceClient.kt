package ru.itplanet.trampline.opportunity.client

import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import ru.itplanet.trampline.commons.model.moderation.CreateInternalModerationTaskRequest
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskResponse
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType

@FeignClient(
    name = "opportunity-moderation-service-client",
    url = "\${moderation.service.url}",
    configuration = [InternalServiceFeignConfig::class],
)
interface ModerationServiceClient {

    @PostMapping("/internal/moderation/tasks")
    fun createTask(
        @RequestBody request: CreateInternalModerationTaskRequest,
    ): InternalModerationTaskResponse

    @GetMapping("/internal/moderation/tasks/by-entity")
    fun getTaskByEntity(
        @RequestParam entityType: ModerationEntityType,
        @RequestParam entityId: Long,
        @RequestParam taskType: ModerationTaskType,
    ): InternalModerationTaskLookupResponse

    @PostMapping("/internal/moderation/tasks/{taskId}/cancel")
    fun cancelTask(
        @PathVariable taskId: Long,
    )
}
