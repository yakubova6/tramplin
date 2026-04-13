package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.profile.dao.ApplicantProfileDao
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.ApplicantProfileWorkspace

@Service
class ApplicantProfileWorkspaceQueryService(
    private val profileService: ProfileService,
    private val applicantProfileDao: ApplicantProfileDao,
) {

    @Transactional(readOnly = true)
    fun getApplicantProfileWorkspace(
        currentUserId: Long,
        targetUserId: Long,
    ): ApplicantProfileWorkspace {
        if (currentUserId != targetUserId) {
            throw ProfileForbiddenException(
                message = "Можно просматривать только workspace своего профиля соискателя",
                code = "applicant_profile_workspace_access_denied",
            )
        }

        val profileDto = applicantProfileDao.findById(targetUserId)
            .orElseThrow {
                ProfileNotFoundException(
                    message = "Профиль соискателя с идентификатором пользователя $targetUserId не найден",
                    code = "applicant_profile_not_found",
                )
            }

        val hasApprovedPublicVersion =
            profileDto.approvedPublicSnapshot.isObject && profileDto.approvedPublicSnapshot.size() > 0

        return ApplicantProfileWorkspace(
            currentProfile = profileService.getApplicantProfile(
                currentUserId = currentUserId,
                targetUserId = targetUserId,
            ),
            publicProfile = profileService.getApplicantPublicProfilePreview(
                targetUserId = targetUserId,
            ),
            moderationStatus = profileDto.moderationStatus,
            hasApprovedPublicVersion = hasApprovedPublicVersion,
        )
    }
}
