package ru.itplanet.trampline.profile.controller

import jakarta.validation.Valid
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest
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
        @CurrentUser currentUserId: Long
    ): ApplicantProfile {
        return profileService.patchApplicantProfile(currentUserId, request)
    }

    @PatchMapping("/employer")
    fun patchEmployerProfile(
        @Valid @RequestBody request: EmployerProfilePatchRequest,
        @CurrentUser currentUserId: Long
        ): EmployerProfile {
        return profileService.patchEmployerProfile(currentUserId, request)
    }
}
