package ru.itplanet.trampline.auth.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.commons.dao.dto.UserDto
import ru.itplanet.trampline.commons.model.Status
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.CreateCuratorRequest
import ru.itplanet.trampline.auth.model.request.Registration
import ru.itplanet.trampline.commons.model.Role

@Component
class UserConverter {

    fun toUserDto(
        source: Registration,
        normalizedEmail: String,
        passwordHash: String,
        status: Status
    ): UserDto {
        return UserDto(
            displayName = source.displayName.trim(),
            email = normalizedEmail,
            passwordHash = passwordHash,
            role = source.role,
            status = status
        )
    }

    fun toCuratorUserDto(
        source: CreateCuratorRequest,
        normalizedEmail: String,
        passwordHash: String
    ): UserDto {
        return UserDto(
            displayName = source.displayName.trim(),
            email = normalizedEmail,
            passwordHash = passwordHash,
            role = Role.CURATOR,
            status = Status.ACTIVE
        )
    }

    fun fromDtoToUser(source: UserDto): User {
        return User(
            id = source.id!!,
            displayName = source.displayName,
            email = source.email,
            role = source.role,
            status = source.status
        )
    }
}
