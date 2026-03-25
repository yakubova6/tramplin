package ru.itplanet.trampline.profile.service

import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest

interface ProfileService {
    fun patchApplicantProfile(userId: Long, request: ApplicantProfilePatchRequest): ApplicantProfile
    fun patchEmployerProfile(userId: Long, request: EmployerProfilePatchRequest): EmployerProfile
    fun getApplicantProfile(currentUserId: Long, targetUserId: Long): ApplicantProfile
    fun getEmployerProfile(currentUserId: Long, targetUserId: Long): EmployerProfile
}