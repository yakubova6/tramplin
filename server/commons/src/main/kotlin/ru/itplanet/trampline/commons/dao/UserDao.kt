package ru.itplanet.trampline.commons.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.dao.dto.UserDto

interface UserDao : JpaRepository<UserDto, Long> {

    fun findByEmail(email: String): UserDto?
}
