package ru.itplanet.trampline.auth.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import ru.itplanet.trampline.auth.model.Role
import ru.itplanet.trampline.auth.model.Status
import java.time.Instant

@Entity
@Table(name = "users")
open class UserDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "display_name", nullable = false)
    var displayName: String = ""

    @Column(name = "email", nullable = false, unique = true)
    var email: String = ""

    @Column(name = "password_hash", nullable = false)
    var passwordHash: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    var role: Role = Role.APPLICANT

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: Status = Status.PENDING_VERIFICATION

    @Column(name = "email_verified", nullable = false)
    var emailVerified: Boolean = true

    @Column(name = "last_login_at")
    var lastLoginAt: Instant? = null

    constructor()

    constructor(
        displayName: String,
        email: String,
        passwordHash: String,
        role: Role,
        status: Status
    ) {
        this.displayName = displayName
        this.email = email
        this.passwordHash = passwordHash
        this.role = role
        this.status = status
    }
}
