package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.exception.ProfileForbiddenException
import ru.itplanet.trampline.profile.exception.ProfileNotFoundException
import ru.itplanet.trampline.profile.model.EmployerProfileWorkspace

@Service
class EmployerProfileWorkspaceQueryService(
    private val profileService: ProfileService,
    private val employerProfileDao: EmployerProfileDao,
) {

    @Transactional(readOnly = true)
    fun getEmployerProfileWorkspace(
        currentUserId: Long,
        targetUserId: Long,
    ): EmployerProfileWorkspace {
        if (currentUserId != targetUserId) {
            throw ProfileForbiddenException(
                message = "Можно просматривать только workspace своего профиля работодателя",
                code = "employer_profile_workspace_access_denied",
            )
        }

        val profileDto = employerProfileDao.findById(targetUserId)
            .orElseThrow {
                ProfileNotFoundException(
                    message = "Профиль работодателя с идентификатором пользователя $targetUserId не найден",
                    code = "employer_profile_not_found",
                )
            }

        val hasApprovedPublicVersion =
            profileDto.approvedPublicSnapshot.isObject && profileDto.approvedPublicSnapshot.size() > 0

        return EmployerProfileWorkspace(
            currentProfile = profileService.getEmployerProfile(
                currentUserId = currentUserId,
                targetUserId = targetUserId,
            ),
            publicProfile = profileService.getEmployerProfile(
                currentUserId = null,
                targetUserId = targetUserId,
            ),
            moderationStatus = profileDto.moderationStatus,
            hasApprovedPublicVersion = hasApprovedPublicVersion,
        )
    }
}
