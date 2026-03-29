package ru.itplanet.trampline.profile.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import ru.itplanet.trampline.profile.client.InteractionPrivacyClient
import ru.itplanet.trampline.profile.model.ApplicantProfile
import ru.itplanet.trampline.profile.model.enums.ApplicationsVisibility
import ru.itplanet.trampline.profile.model.enums.ContactsVisibility
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility

@Service
class ApplicantProfileVisibilityService(
    private val interactionPrivacyClient: InteractionPrivacyClient,
) {

    fun sanitizeApplicantProfile(
        profile: ApplicantProfile,
        currentUserId: Long?,
    ): ApplicantProfile {
        val viewer = resolveViewer(
            currentUserId = currentUserId,
            targetUserId = profile.userId,
        )

        if (viewer == ApplicantProfileViewer.OWNER) {
            return profile
        }

        var sanitized = profile

        if (!canAccessProfileBlock(profile.profileVisibility, viewer)) {
            sanitized = sanitized.copy(
                firstName = null,
                lastName = null,
                middleName = null,
                universityName = null,
                facultyName = null,
                studyProgram = null,
                course = null,
                graduationYear = null,
                city = null,
                about = null,
                avatar = null,
            )
        }

        if (!canAccessResumeBlock(profile.resumeVisibility, viewer)) {
            sanitized = sanitized.copy(
                resumeText = null,
                portfolioLinks = emptyList(),
                resumeFile = null,
                portfolioFiles = emptyList(),
                skills = emptyList(),
                interests = emptyList(),
            )
        }

        if (!canAccessContactsBlock(profile.contactsVisibility, viewer)) {
            sanitized = sanitized.copy(
                contactLinks = emptyList(),
            )
        }

        return sanitized
    }

    fun canViewApplicantContacts(
        visibility: ContactsVisibility,
        currentUserId: Long?,
        targetUserId: Long,
    ): Boolean {
        val viewer = resolveViewer(currentUserId, targetUserId)
        return canAccessContactsBlock(visibility, viewer)
    }

    fun canViewApplicantApplications(
        visibility: ApplicationsVisibility,
        currentUserId: Long?,
        targetUserId: Long,
    ): Boolean {
        val viewer = resolveViewer(currentUserId, targetUserId)
        return canAccessApplicationsBlock(visibility, viewer)
    }

    private fun resolveViewer(
        currentUserId: Long?,
        targetUserId: Long,
    ): ApplicantProfileViewer {
        if (currentUserId == null) {
            return ApplicantProfileViewer.ANONYMOUS
        }

        if (currentUserId == targetUserId) {
            return ApplicantProfileViewer.OWNER
        }

        return if (isAcceptedContact(currentUserId, targetUserId)) {
            ApplicantProfileViewer.CONTACT
        } else {
            ApplicantProfileViewer.AUTHENTICATED
        }
    }

    private fun isAcceptedContact(
        firstUserId: Long,
        secondUserId: Long,
    ): Boolean {
        return try {
            interactionPrivacyClient.isAcceptedContact(
                firstUserId = firstUserId,
                secondUserId = secondUserId,
            ).accepted
        } catch (ex: Exception) {
            logger.warn(
                "Failed to resolve contact relation between users {} and {}",
                firstUserId,
                secondUserId,
                ex,
            )
            false
        }
    }

    private fun canAccessProfileBlock(
        visibility: ProfileVisibility,
        viewer: ApplicantProfileViewer,
    ): Boolean {
        return when (visibility) {
            ProfileVisibility.PUBLIC -> true
            ProfileVisibility.AUTHENTICATED -> viewer != ApplicantProfileViewer.ANONYMOUS
            ProfileVisibility.PRIVATE -> viewer == ApplicantProfileViewer.OWNER
        }
    }

    private fun canAccessResumeBlock(
        visibility: ResumeVisibility,
        viewer: ApplicantProfileViewer,
    ): Boolean {
        return when (visibility) {
            ResumeVisibility.PUBLIC -> true
            ResumeVisibility.AUTHENTICATED -> viewer != ApplicantProfileViewer.ANONYMOUS
            ResumeVisibility.PRIVATE -> viewer == ApplicantProfileViewer.OWNER
        }
    }

    private fun canAccessContactsBlock(
        visibility: ContactsVisibility,
        viewer: ApplicantProfileViewer,
    ): Boolean {
        return when (visibility) {
            ContactsVisibility.PUBLIC -> true
            ContactsVisibility.AUTHENTICATED -> viewer != ApplicantProfileViewer.ANONYMOUS
            ContactsVisibility.PRIVATE -> viewer == ApplicantProfileViewer.OWNER
        }
    }

    private fun canAccessApplicationsBlock(
        visibility: ApplicationsVisibility,
        viewer: ApplicantProfileViewer,
    ): Boolean {
        return when (visibility) {
            ApplicationsVisibility.PUBLIC -> true
            ApplicationsVisibility.AUTHENTICATED -> viewer != ApplicantProfileViewer.ANONYMOUS
            ApplicationsVisibility.PRIVATE -> viewer == ApplicantProfileViewer.OWNER
        }
    }

    private enum class ApplicantProfileViewer {
        OWNER,
        CONTACT,
        AUTHENTICATED,
        ANONYMOUS,
    }

    private companion object {
        private val logger = LoggerFactory.getLogger(ApplicantProfileVisibilityService::class.java)
    }
}
