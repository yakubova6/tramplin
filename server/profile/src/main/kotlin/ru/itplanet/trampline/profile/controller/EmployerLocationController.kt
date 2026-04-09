package ru.itplanet.trampline.profile.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.model.EmployerLocation
import ru.itplanet.trampline.profile.model.request.CreateEmployerLocationRequest
import ru.itplanet.trampline.profile.model.request.PatchEmployerLocationRequest
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.EmployerLocationService

@Validated
@RestController
@RequestMapping("/api/profile/employer/locations")
class EmployerLocationController(
    private val employerLocationService: EmployerLocationService,
) {

    @GetMapping
    fun getMyLocations(
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<EmployerLocation> {
        requireEmployer(currentUser)
        return employerLocationService.getMyLocations(currentUser.userId)
    }

    @PostMapping
    fun createLocation(
        @Valid @RequestBody request: CreateEmployerLocationRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerLocation {
        requireEmployer(currentUser)
        return employerLocationService.createLocation(currentUser.userId, request)
    }

    @PatchMapping("/{id}")
    fun patchLocation(
        @PathVariable
        @Positive(message = "Идентификатор локации должен быть положительным")
        id: Long,
        @Valid @RequestBody request: PatchEmployerLocationRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerLocation {
        requireEmployer(currentUser)
        return employerLocationService.patchLocation(currentUser.userId, id, request)
    }

    @DeleteMapping("/{id}")
    fun deleteLocation(
        @PathVariable
        @Positive(message = "Идентификатор локации должен быть положительным")
        id: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ResponseEntity<Unit> {
        requireEmployer(currentUser)
        employerLocationService.deleteLocation(currentUser.userId, id)
        return ResponseEntity.noContent().build()
    }

    private fun requireEmployer(currentUser: AuthenticatedUser) {
        if (currentUser.role != Role.EMPLOYER) {
            throw ProfileForbiddenException(
                message = "Только работодатель может управлять своими локациями",
                code = "employer_role_required",
            )
        }
    }
}
