package ru.itplanet.trampline.profile.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import ru.itplanet.trampline.profile.model.enums.ApplicantTagRelationType

@Entity
@Table(name = "applicant_tag")
@IdClass(ApplicantTagId::class)
open class ApplicantTagDto {

    @Id
    @Column(name = "applicant_user_id", nullable = false)
    open var applicantUserId: Long = 0

    @Id
    @Column(name = "tag_id", nullable = false)
    open var tagId: Long = 0

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 32)
    open var relationType: ApplicantTagRelationType = ApplicantTagRelationType.SKILL

    constructor()

    constructor(
        applicantUserId: Long,
        tagId: Long,
        relationType: ApplicantTagRelationType,
    ) {
        this.applicantUserId = applicantUserId
        this.tagId = tagId
        this.relationType = relationType
    }
}
