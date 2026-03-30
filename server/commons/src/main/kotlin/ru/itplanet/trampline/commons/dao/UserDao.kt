package ru.itplanet.trampline.commons.dao

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.commons.dao.dto.UserDto

interface UserDao : JpaRepository<UserDto, Long> {

    fun findByEmail(email: String): UserDto?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserDto u where u.email = :email")
    fun findByEmailForUpdate(@Param("email") email: String): UserDto?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserDto u where u.id = :id")
    fun findByIdForUpdate(@Param("id") id: Long): UserDto?
}
