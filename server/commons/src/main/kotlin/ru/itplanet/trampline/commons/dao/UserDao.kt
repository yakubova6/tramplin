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

    @Query(
        value = """
            SELECT *
            FROM users u
            WHERE u.role IN ('ADMIN', 'CURATOR')
              AND (
                    :search IS NULL
                    OR LOWER(u.display_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            ORDER BY
                u.is_active DESC,
                CASE WHEN u.role = 'ADMIN' THEN 0 ELSE 1 END,
                LOWER(u.display_name) ASC,
                u.id ASC
            LIMIT :limit OFFSET :offset
        """,
        nativeQuery = true,
    )
    fun findCuratorAccounts(
        @Param("search") search: String?,
        @Param("limit") limit: Int,
        @Param("offset") offset: Long,
    ): List<UserDto>

    @Query(
        value = """
            SELECT COUNT(*)
            FROM users u
            WHERE u.role IN ('ADMIN', 'CURATOR')
              AND (
                    :search IS NULL
                    OR LOWER(u.display_name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
              )
        """,
        nativeQuery = true,
    )
    fun countCuratorAccounts(
        @Param("search") search: String?,
    ): Long
}
