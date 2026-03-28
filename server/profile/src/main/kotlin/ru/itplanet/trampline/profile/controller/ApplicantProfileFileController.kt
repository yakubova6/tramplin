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
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.ProfileService

@Validated
@RestController
@RequestMapping("/api/applicant/profile")
class ApplicantProfileFileController(
    private val profileService: ProfileService,
) {

    @PutMapping(
        value = ["/resume-file"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun putResumeFile(
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ApplicantProfile {
        ensureApplicant(currentUser)
        return profileService.putApplicantResumeFile(
            userId = currentUser.userId,
            file = file,
        )
    }

    @PostMapping(
        value = ["/portfolio/files"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun addPortfolioFile(
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<InternalFileAttachmentResponse> {
        ensureApplicant(currentUser)
        return profileService.addApplicantPortfolioFile(
            userId = currentUser.userId,
            file = file,
        )
    }

    @DeleteMapping("/files/{fileId}")
    fun deleteApplicantFile(
        @PathVariable @Positive fileId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ApplicantProfile {
        ensureApplicant(currentUser)
        return profileService.deleteApplicantFile(currentUser.userId, fileId)
    }

    private fun ensureApplicant(currentUser: AuthenticatedUser) {
        if (currentUser.role != Role.APPLICANT) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only applicant can edit applicant profile",
            )
        }
    }
}
