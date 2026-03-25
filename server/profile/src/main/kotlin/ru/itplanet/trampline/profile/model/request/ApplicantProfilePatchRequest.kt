package ru.itplanet.trampline.profile.model.request

import ru.itplanet.trampline.profile.model.enums.ApplicationsVisibility
import ru.itplanet.trampline.profile.model.enums.ContactsVisibility
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility

data class ApplicantProfilePatchRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val middleName: String? = null,
    val universityName: String? = null,
    val facultyName: String? = null,
    val studyProgram: String? = null,
    val course: Short? = null,
    val graduationYear: Short? = null,
    val cityId: Long? = null,
    val about: String? = null,
    val resumeText: String? = null,
    val portfolioLinks: List<String>? = null,
    val contactLinks: List<String>? = null,
    val profileVisibility: ProfileVisibility? = null,
    val resumeVisibility: ResumeVisibility? = null,
    val applicationsVisibility: ApplicationsVisibility? = null,
    val contactsVisibility: ContactsVisibility? = null,
    val openToWork: Boolean? = null,
    val openToEvents: Boolean? = null
)