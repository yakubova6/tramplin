package ru.itplanet.trampline.auth.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import ru.itplanet.trampline.auth.dao.dto.UserDto
import java.util.UUID

interface UserDao:
    JpaRepository<UserDto, UUID>,
    JpaSpecificationExecutor<UserDto>{
        fun findByUsernameOrEmail(username: String, email: String): UserDto?
    }