package ru.itplanet.trampline.profile.model

import ru.itplanet.trampline.commons.model.City
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse
import ru.itplanet.trampline.profile.model.enums.ApplicationsVisibility
import ru.itplanet.trampline.profile.model.enums.ContactsVisibility
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility

data class ApplicantProfile(
    val userId: Long,
    val firstName: String?,
    val lastName: String?,
    val middleName: String?,
    val universityName: String?,
    val facultyName: String?,
    val studyProgram: String?,
    val course: Short?,
    val graduationYear: Short?,
    val city: City?,
    val about: String?,
    val resumeText: String?,
    val portfolioLinks: List<ProfileLink>,
    val contactLinks: List<ContactMethod>,
    val profileVisibility: ProfileVisibility,
    val resumeVisibility: ResumeVisibility,
    val applicationsVisibility: ApplicationsVisibility,
    val contactsVisibility: ContactsVisibility,
    val openToWork: Boolean,
    val openToEvents: Boolean,
    val avatar: InternalFileMetadataResponse? = null,
    val resumeFile: InternalFileMetadataResponse? = null,
    val portfolioFiles: List<InternalFileMetadataResponse> = emptyList(),
    val skills: List<Tag> = emptyList(),
    val interests: List<Tag> = emptyList(),
)
