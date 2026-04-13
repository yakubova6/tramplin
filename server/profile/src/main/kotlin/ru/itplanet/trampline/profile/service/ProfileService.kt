package ru.itplanet.trampline.profile.service

import org.springframework.web.multipart.MultipartFile
import ru.itplanet.trampline.commons.model.file.InternalFileAttachmentResponse
import ru.itplanet.trampline.commons.model.file.InternalFileDownloadUrlResponse
import ru.itplanet.trampline.profile.model.ApplicantApplicationSummary
import ru.itplanet.trampline.profile.model.ApplicantContactSummary
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.ApplicantProfileSearchPage
import ru.itplanet.trampline.profile.model.EmployerProfile
import ru.itplanet.trampline.profile.model.request.ApplicantProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerCompanyPatchRequest
import ru.itplanet.trampline.profile.model.request.EmployerProfilePatchRequest
import ru.itplanet.trampline.profile.model.request.GetApplicantProfileListRequest

interface ProfileService {
    fun patchApplicantProfile(userId: Long, request: ApplicantProfilePatchRequest): ApplicantProfile
    fun submitApplicantProfileForModeration(userId: Long): ApplicantProfile
    fun putApplicantAvatar(userId: Long, file: MultipartFile): ApplicantProfile
    fun putApplicantResumeFile(userId: Long, file: MultipartFile): ApplicantProfile
    fun addApplicantPortfolioFile(userId: Long, file: MultipartFile): List<InternalFileAttachmentResponse>
    fun deleteApplicantFile(userId: Long, fileId: Long): ApplicantProfile

    fun patchEmployerProfile(userId: Long, request: EmployerProfilePatchRequest): EmployerProfile
    fun patchEmployerCompany(userId: Long, request: EmployerCompanyPatchRequest): EmployerProfile
    fun submitEmployerProfileForModeration(userId: Long): EmployerProfile
    fun putEmployerLogo(userId: Long, file: MultipartFile): EmployerProfile
    fun deleteEmployerFile(userId: Long, fileId: Long): EmployerProfile

    fun searchApplicants(currentUserId: Long, request: GetApplicantProfileListRequest): ApplicantProfileSearchPage
    fun getApplicantProfile(currentUserId: Long?, targetUserId: Long): ApplicantProfile
    fun getApplicantPublicProfilePreview(targetUserId: Long): ApplicantProfile
    fun getApplicantContacts(currentUserId: Long?, targetUserId: Long): List<ApplicantContactSummary>
    fun getApplicantApplications(currentUserId: Long?, targetUserId: Long): List<ApplicantApplicationSummary>

    fun getEmployerProfile(currentUserId: Long?, targetUserId: Long): EmployerProfile

    fun getApplicantFileDownloadUrl(currentUserId: Long?, targetUserId: Long, fileId: Long): InternalFileDownloadUrlResponse
    fun getEmployerFileDownloadUrl(currentUserId: Long?, targetUserId: Long, fileId: Long): InternalFileDownloadUrlResponse
}
