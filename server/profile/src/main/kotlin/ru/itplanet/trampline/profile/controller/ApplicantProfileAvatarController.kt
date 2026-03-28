package ru.itplanet.trampline.profile.controller

import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.ProfileService

@Validated
@RestController
@RequestMapping("/api/applicant/profile")
class ApplicantProfileAvatarController(
    private val profileService: ProfileService,
) {

    @PutMapping(
        value = ["/avatar"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun putApplicantAvatar(
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ApplicantProfile {
        if (currentUser.role != Role.APPLICANT) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only applicant can upload applicant avatar",
            )
        }

        return profileService.putApplicantAvatar(currentUser.userId, file)
    }
}
