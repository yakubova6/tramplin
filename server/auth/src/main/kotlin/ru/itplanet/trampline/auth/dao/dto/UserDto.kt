package ru.itplanet.trampline.auth.dao.dto

import jakarta.persistence.*
import java.util.*

@Entity
@Table(name = "users")
open class UserDto {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "username", nullable = false, unique = true)
    var username: String = ""

    @Column(name = "email", nullable = false, unique = true)
    var email: String = ""

    @Column(name = "password", nullable = false)
    var password: String = ""

    constructor() {}

    constructor(username: String, email: String, password: String) {
        this.username = username
        this.email = email
        this.password = password
    }
}