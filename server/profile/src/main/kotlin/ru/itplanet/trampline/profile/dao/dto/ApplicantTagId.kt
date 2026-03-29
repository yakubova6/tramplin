package ru.itplanet.trampline.profile.dao.dto

import ru.itplanet.trampline.profile.model.enums.ApplicantTagRelationType
import java.io.Serializable

data class ApplicantTagId(
    var applicantUserId: Long = 0,
    var tagId: Long = 0,
    var relationType: ApplicantTagRelationType = ApplicantTagRelationType.SKILL,
) : Serializable
