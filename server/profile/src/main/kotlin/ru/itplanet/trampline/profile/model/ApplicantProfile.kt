package ru.itplanet.trampline.profile.model

import ru.itplanet.trampline.profile.model.enums.ApplicationsVisibility
import ru.itplanet.trampline.profile.model.enums.ContactsVisibility
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility

data class ApplicantProfile (
    val userId: Long,
    val firstName: String,
    val lastName: String,
    val middleName: String?,
    val universityName: String?,
    val facultyName: String?,
    val studyProgram: String?,
    val course: Short?,
    val graduationYear: Short?,
    val cityId: Long?,
    val about: String?,
    val resumeText: String?,
    val portfolioLinks: List<String>, // TODO: переделать в List моделей
    val contactLinks: List<String>, // TODO: переделать в List моделей
    val profileVisibility: ProfileVisibility,
    val resumeVisibility: ResumeVisibility,
    val applicationsVisibility: ApplicationsVisibility,
    val contactsVisibility: ContactsVisibility,
    val openToWork: Boolean,
    val openToEvents: Boolean
)