package ru.itplanet.trampline.profile.controller

import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.ProfileService

@Validated
@RestController
@RequestMapping("/api/employer/profile")
class EmployerProfileFileController(
    private val profileService: ProfileService,
) {

    @PutMapping(
        value = ["/logo"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun putLogo(
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerProfile {
        if (currentUser.role != Role.EMPLOYER) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only employer can edit employer profile",
            )
        }

        return profileService.putEmployerLogo(
            userId = currentUser.userId,
            file = file,
        )
    }

    @DeleteMapping("/files/{fileId}")
    fun deleteEmployerFile(
        @PathVariable @Positive fileId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerProfile {
        if (currentUser.role != Role.EMPLOYER) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only employer can delete employer files",
            )
        }

        return profileService.deleteEmployerFile(currentUser.userId, fileId)
    }
}
