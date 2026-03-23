package ru.itplanet.trampline.auth.service

import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.CreateCuratorRequest

interface AdminService {
    fun createCurator(request: CreateCuratorRequest): User
}
