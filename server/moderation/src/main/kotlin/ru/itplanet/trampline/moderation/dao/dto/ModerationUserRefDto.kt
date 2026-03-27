package ru.itplanet.trampline.moderation.dao.dto

import jakarta.persistence.*
import ru.itplanet.trampline.commons.model.Role

@Entity
@Table(name = "users")
open class ModerationUserRefDto {
    @Id
    @Column(name = "id")
    var id: Long? = null

    @Column(name = "email", nullable = false)
    var email: String = ""

    @Column(name = "display_name", nullable = false)
    var displayName: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    var role: Role = Role.APPLICANT
}
