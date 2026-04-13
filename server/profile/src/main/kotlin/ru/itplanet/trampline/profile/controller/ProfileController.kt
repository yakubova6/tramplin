package ru.itplanet.trampline.profile.controller

import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.itplanet.trampline.commons.annotation.CurrentUser
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.model.ApplicantApplicationSummary
import ru.itplanet.trampline.profile.model.ApplicantContactSummary
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.ApplicantProfileSearchPage
import ru.itplanet.trampline.profile.model.ApplicantProfileWorkspace
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.EmployerProfileWorkspace
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerCompanyPatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.GetApplicantProfileListRequest
import ru.itplanet.trampline.profile.security.AuthenticatedUser
import ru.itplanet.trampline.profile.service.ApplicantProfileWorkspaceQueryService
import ru.itplanet.trampline.profile.service.EmployerProfileWorkspaceQueryService
import ru.itplanet.trampline.profile.service.ProfileService

@Validated
@RestController
@RequestMapping("/api/profile/")
class ProfileController(
    private val profileService: ProfileService,
    private val applicantProfileWorkspaceQueryService: ApplicantProfileWorkspaceQueryService,
    private val employerProfileWorkspaceQueryService: EmployerProfileWorkspaceQueryService,
) {

    @PatchMapping("/applicant")
    fun patchApplicantProfile(
        @Valid @RequestBody request: ApplicantProfilePatchRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ApplicantProfile {
        if (currentUser.role != Role.APPLICANT) {
            throw ProfileForbiddenException(
                message = "Только соискатель может редактировать профиль соискателя",
                code = "applicant_role_required",
            )
        }

        return profileService.patchApplicantProfile(currentUser.userId, request)
    }

    @PostMapping("/applicant/moderation/submit")
    fun submitApplicantProfileForModeration(
        @CurrentUser currentUser: AuthenticatedUser,
    ): ApplicantProfile {
        if (currentUser.role != Role.APPLICANT) {
            throw ProfileForbiddenException(
                message = "Только соискатель может отправить профиль на модерацию",
                code = "applicant_role_required",
            )
        }

        return profileService.submitApplicantProfileForModeration(currentUser.userId)
    }

    @PatchMapping("/employer")
    fun patchEmployerProfile(
        @Valid @RequestBody request: EmployerProfilePatchRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerProfile {
        if (currentUser.role != Role.EMPLOYER) {
            throw ProfileForbiddenException(
                message = "Только работодатель может редактировать профиль работодателя",
                code = "employer_role_required",
            )
        }

        return profileService.patchEmployerProfile(currentUser.userId, request)
    }

    @PatchMapping("/employer/company")
    fun patchEmployerCompany(
        @Valid @RequestBody request: EmployerCompanyPatchRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerProfile {
        if (currentUser.role != Role.EMPLOYER) {
            throw ProfileForbiddenException(
                message = "Только работодатель может редактировать данные компании",
                code = "employer_role_required",
            )
        }

        return profileService.patchEmployerCompany(currentUser.userId, request)
    }

    @PostMapping("/employer/moderation/submit")
    fun submitEmployerProfileForModeration(
        @CurrentUser currentUser: AuthenticatedUser,
    ): EmployerProfile {
        if (currentUser.role != Role.EMPLOYER) {
            throw ProfileForbiddenException(
                message = "Только работодатель может отправить профиль на модерацию",
                code = "employer_role_required",
            )
        }

        return profileService.submitEmployerProfileForModeration(currentUser.userId)
    }

    @GetMapping("/applicants")
    fun searchApplicants(
        @Valid @ModelAttribute request: GetApplicantProfileListRequest,
        @CurrentUser currentUser: AuthenticatedUser,
    ): ApplicantProfileSearchPage {
        return profileService.searchApplicants(currentUser.userId, request)
    }

    // TODO:
    //  После перевода seeker dashboard на GET /api/profile/applicant/{userId}/workspace
    //  убрать owner-specific использование этой ручки в кабинете соискателя.
    //  Сам endpoint оставить как публичную read-model ручку профиля соискателя,
    //  потому что он нужен внешним consumer'ам и другим сервисам.
    @GetMapping("/applicant/{userId}")
    fun getApplicantProfile(
        @CurrentUser currentUserId: Long?,
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
    ): ApplicantProfile {
        return profileService.getApplicantProfile(currentUserId, userId)
    }

    @GetMapping("/applicant/{userId}/workspace")
    fun getApplicantProfileWorkspace(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
    ): ApplicantProfileWorkspace {
        if (currentUser.role != Role.APPLICANT) {
            throw ProfileForbiddenException(
                message = "Только соискатель может просматривать workspace профиля соискателя",
                code = "applicant_role_required",
            )
        }

        return applicantProfileWorkspaceQueryService.getApplicantProfileWorkspace(
            currentUserId = currentUser.userId,
            targetUserId = userId,
        )
    }

    @GetMapping("/applicant/{userId}/contacts")
    fun getApplicantContacts(
        @CurrentUser currentUserId: Long?,
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
    ): List<ApplicantContactSummary> {
        return profileService.getApplicantContacts(currentUserId, userId)
    }

    @GetMapping("/applicant/{userId}/applications")
    fun getApplicantApplications(
        @CurrentUser currentUserId: Long?,
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
    ): List<ApplicantApplicationSummary> {
        return profileService.getApplicantApplications(currentUserId, userId)
    }

    // TODO:
    //  После перевода employer dashboard на GET /api/profile/employer/{userId}/workspace
    //  убрать owner-specific использование этой ручки в кабинете работодателя.
    //  Сам endpoint оставить как публичную read-model ручку профиля работодателя,
    //  потому что он нужен внешним consumer'ам и другим сервисам.
    @GetMapping("/employer/{userId}")
    fun getEmployerProfile(
        @CurrentUser currentUserId: Long?,
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
    ): EmployerProfile {
        return profileService.getEmployerProfile(currentUserId, userId)
    }

    @GetMapping("/employer/{userId}/workspace")
    fun getEmployerProfileWorkspace(
        @CurrentUser currentUser: AuthenticatedUser,
        @PathVariable @Positive(message = "Идентификатор пользователя должен быть положительным") userId: Long,
    ): EmployerProfileWorkspace {
        if (currentUser.role != Role.EMPLOYER) {
            throw ProfileForbiddenException(
                message = "Только работодатель может просматривать workspace профиля работодателя",
                code = "employer_role_required",
            )
        }

        return employerProfileWorkspaceQueryService.getEmployerProfileWorkspace(
            currentUserId = currentUser.userId,
            targetUserId = userId,
        )
    }
}
