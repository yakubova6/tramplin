package ru.itplanet.trampline.auth.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.auth.dao.dto.UserDto

interface UserDao : JpaRepository<UserDto, Long> {

    fun findByEmail(email: String): UserDto?
}
