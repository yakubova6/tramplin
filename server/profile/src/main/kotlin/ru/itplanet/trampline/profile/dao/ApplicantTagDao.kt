package ru.itplanet.trampline.profile.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.profile.dao.dto.ApplicantTagDto
import ru.itplanet.trampline.profile.dao.dto.ApplicantTagId
import ru.itplanet.trampline.profile.model.enums.ApplicantTagRelationType

interface ApplicantTagDao : JpaRepository<ApplicantTagDto, ApplicantTagId> {

    fun findAllByApplicantUserId(applicantUserId: Long): List<ApplicantTagDto>

    fun deleteAllByApplicantUserIdAndRelationType(
        applicantUserId: Long,
        relationType: ApplicantTagRelationType,
    )
}
