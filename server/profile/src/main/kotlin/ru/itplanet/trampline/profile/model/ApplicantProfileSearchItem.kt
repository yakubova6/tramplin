package ru.itplanet.trampline.profile.model

import ru.itplanet.trampline.commons.model.City
import ru.itplanet.trampline.commons.model.Tag
import ru.itplanet.trampline.commons.model.file.InternalFileMetadataResponse

data class ApplicantProfileSearchItem(
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
    val avatar: InternalFileMetadataResponse? = null,
    val skills: List<Tag> = emptyList(),
    val interests: List<Tag> = emptyList(),
    val openToWork: Boolean,
    val openToEvents: Boolean,
)
