package ru.itplanet.trampline.profile.controller

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.ProfileService

@Validated
@RestController
@RequestMapping("/api/profile/")
class ProfileController(
    private val profileService: ProfileService
) {

    @PatchMapping("/applicant")
    fun patchApplicantProfile(
        @Valid @RequestBody request: ApplicantProfilePatchRequest,
        @CurrentUser currentUser: AuthenticatedUser
    ): ApplicantProfile {
        if (currentUser.role != Role.APPLICANT) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only applicant can edit applicant profile"
            )
        }
        return profileService.patchApplicantProfile(currentUser.userId, request)
    }

    @PatchMapping("/employer")
    fun patchEmployerProfile(
        @Valid @RequestBody request: EmployerProfilePatchRequest,
        @CurrentUser currentUser: AuthenticatedUser
    ): EmployerProfile {
        if (currentUser.role != Role.EMPLOYER) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only employer can edit employer profile")
        }
        return profileService.patchEmployerProfile(currentUser.userId, request)
    }

    @GetMapping("/applicant/{userId}")
    fun getApplicantProfile(
        @CurrentUser currentUserId: Long,
        @PathVariable userId: Long
    ): ApplicantProfile {
        return profileService.getApplicantProfile(currentUserId, userId)
    }

    @GetMapping("/employer/{userId}")
    fun getEmployerProfile(
        @CurrentUser currentUserId: Long,
        @PathVariable userId: Long
    ): EmployerProfile {
        return profileService.getEmployerProfile(currentUserId, userId)
    }
}
