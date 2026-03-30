package ru.itplanet.trampline.commons.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import ru.itplanet.trampline.commons.model.Role
import java.time.Instant

@Entity
@Table(name = "users")
open class UserDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "display_name", nullable = false)
    open var displayName: String = ""

    @Column(name = "email", nullable = false, unique = true)
    open var email: String = ""

    @Column(name = "password_hash", nullable = false)
    open var passwordHash: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    open var role: Role = Role.APPLICANT

    @Column(name = "email_verified", nullable = false)
    open var emailVerified: Boolean = true

    @Column(name = "two_factor_enabled", nullable = false)
    open var twoFactorEnabled: Boolean = false

    @Column(name = "last_login_at")
    open var lastLoginAt: Instant? = null

    @Column(name = "password_reset_code_hash")
    open var passwordResetCodeHash: String? = null

    @Column(name = "password_reset_code_expires_at")
    open var passwordResetCodeExpiresAt: Instant? = null

    @Column(name = "password_reset_code_sent_at")
    open var passwordResetCodeSentAt: Instant? = null

    @Column(name = "password_reset_code_attempts", nullable = false)
    open var passwordResetCodeAttempts: Int = 0

    @Column(name = "password_reset_token_hash")
    open var passwordResetTokenHash: String? = null

    @Column(name = "password_reset_token_expires_at")
    open var passwordResetTokenExpiresAt: Instant? = null

    constructor()

    constructor(
        displayName: String,
        email: String,
        passwordHash: String,
        role: Role,
    ) {
        this.displayName = displayName
        this.email = email
        this.passwordHash = passwordHash
        this.role = role
    }
}
