package ru.itplanet.trampline.profile.controller

import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.EmployerVerificationService

@Validated
@RestController
@RequestMapping("/api/employer/verifications")
class EmployerVerificationAttachmentController(
    private val employerVerificationService: EmployerVerificationService,
) {

    @GetMapping("/{verificationId}/attachments")
    fun getAttachments(
        @PathVariable
        @Positive(message = "Идентификатор запроса на верификацию должен быть положительным")
        verificationId: Long,
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<InternalFileAttachmentResponse> {
        if (currentUser.role != Role.EMPLOYER) {
            throw ProfileForbiddenException(
                message = "Только работодатель может просматривать вложения для верификации",
                code = "employer_role_required",
            )
        }

        return employerVerificationService.getAttachments(
            employerUserId = currentUser.userId,
            verificationId = verificationId,
        )
    }

    @PostMapping(
        "/{verificationId}/attachments",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    @ResponseStatus(HttpStatus.CREATED)
    fun addAttachment(
        @PathVariable
        @Positive(message = "Идентификатор запроса на верификацию должен быть положительным")
        verificationId: Long,
        @RequestPart("file") file: MultipartFile,
        @CurrentUser currentUser: AuthenticatedUser,
    ): List<InternalFileAttachmentResponse> {
        if (currentUser.role != Role.EMPLOYER) {
            throw ProfileForbiddenException(
                message = "Только работодатель может загружать вложения для верификации",
                code = "employer_role_required",
            )
        }

        return employerVerificationService.addAttachment(
            employerUserId = currentUser.userId,
            verificationId = verificationId,
            file = file,
        )
    }
}
