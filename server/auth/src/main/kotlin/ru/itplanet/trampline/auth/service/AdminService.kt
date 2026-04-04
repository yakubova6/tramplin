package ru.itplanet.trampline.auth.service

import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.CreateCuratorRequest
import ru.itplanet.trampline.auth.model.request.GetCuratorsRequest
import ru.itplanet.trampline.auth.model.request.UpdateCuratorAccessRequest
import ru.itplanet.trampline.auth.model.response.CuratorDetailResponse
import ru.itplanet.trampline.auth.model.response.CuratorPageResponse

interface AdminService {
    fun createCurator(request: CreateCuratorRequest): User
    fun getCurators(request: GetCuratorsRequest): CuratorPageResponse
    fun getCuratorDetail(curatorId: Long): CuratorDetailResponse
    fun updateCuratorAccess(
        actorUserId: Long,
        curatorId: Long,
        request: UpdateCuratorAccessRequest,
    ): CuratorDetailResponse
}
