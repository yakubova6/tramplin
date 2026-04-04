package ru.itplanet.trampline.auth.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.auth.model.AuthenticatedUser
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.CreateCuratorRequest
import ru.itplanet.trampline.auth.model.request.GetCuratorsRequest
import ru.itplanet.trampline.auth.model.request.UpdateCuratorAccessRequest
import ru.itplanet.trampline.auth.model.response.CuratorDetailResponse
import ru.itplanet.trampline.auth.model.response.CuratorPageResponse
import ru.itplanet.trampline.auth.service.AdminService

@Validated
@RestController
@RequestMapping("/api/admin/curators")
class AdminController(
    private val adminService: AdminService
) {

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun getCurators(
        @Valid @ModelAttribute request: GetCuratorsRequest,
    ): CuratorPageResponse {
        return adminService.getCurators(request)
    }

    @GetMapping("/{curatorId}")
    @PreAuthorize("hasRole('ADMIN')")
    fun getCuratorDetail(
        @PathVariable @Positive curatorId: Long,
    ): CuratorDetailResponse {
        return adminService.getCuratorDetail(curatorId)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    fun createCurator(
        @Valid @RequestBody request: CreateCuratorRequest
    ): User {
        return adminService.createCurator(request)
    }

    @PatchMapping("/{curatorId}/access")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateCuratorAccess(
        @PathVariable @Positive curatorId: Long,
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: UpdateCuratorAccessRequest,
    ): CuratorDetailResponse {
        return adminService.updateCuratorAccess(
            actorUserId = principal.userId,
            curatorId = curatorId,
            request = request,
        )
    }
}
