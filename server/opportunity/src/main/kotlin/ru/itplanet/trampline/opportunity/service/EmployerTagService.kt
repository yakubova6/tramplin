package ru.itplanet.trampline.opportunity.service

import ru.itplanet.trampline.commons.model.moderation.InternalModerationTaskLookupResponse
import ru.itplanet.trampline.opportunity.model.EmployerTagResponse
import ru.itplanet.trampline.opportunity.model.request.CreateEmployerTagRequest

interface EmployerTagService {

    fun create(
        employerUserId: Long,
        request: CreateEmployerTagRequest,
    ): EmployerTagResponse

    fun getModerationTask(
        employerUserId: Long,
        tagId: Long,
    ): InternalModerationTaskLookupResponse

    fun cancelModerationTask(
        employerUserId: Long,
        tagId: Long,
    )
}
