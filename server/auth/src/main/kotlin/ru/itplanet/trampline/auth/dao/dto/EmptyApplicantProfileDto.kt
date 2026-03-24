package ru.itplanet.trampline.auth.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "applicant_profile")
open class EmptyApplicantProfileDto {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    var userId: Long? = null

    constructor()

    constructor(userId: Long) {
        this.userId = userId
    }
}
