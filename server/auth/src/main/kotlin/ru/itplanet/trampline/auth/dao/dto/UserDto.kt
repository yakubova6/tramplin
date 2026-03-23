package ru.itplanet.trampline.auth.dao.dto

import jakarta.persistence.*
import ru.itplanet.trampline.auth.model.Role
import ru.itplanet.trampline.auth.model.Status
import java.util.*

@Entity
@Table(name = "users")
open class UserDto {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "display_name", nullable = false)
    var displayName: String = ""

    @Column(name = "email", nullable = false, unique = true)
    var email: String = ""

    @Column(name = "password", nullable = false)
    var password: String = ""

    @Column(name = "role", nullable = false)
    var role: Role = Role.APPLICANT

    @Column(name = "status", nullable = false)
    var status: Status = Status.PENDING_VERIFICATION

    constructor() {}

    constructor(displayName: String, email: String, password: String, role: Role, status: Status) {
        this.displayName = displayName
        this.email = email
        this.password = password
        this.role = role
        this.status = status
    }
}