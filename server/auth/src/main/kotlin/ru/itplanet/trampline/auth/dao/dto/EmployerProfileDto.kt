package ru.itplanet.trampline.auth.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "employer_profile")
open class EmployerProfileDto {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    var userId: Long = 0

    constructor()

    constructor(userId: Long) {
        this.userId = userId
    }
}
