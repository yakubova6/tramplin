package ru.itplanet.trampline.auth.converter

import org.springframework.stereotype.Component
import ru.itplanet.trampline.auth.dao.dto.UserDto
import ru.itplanet.trampline.auth.model.Status
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.Registration

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

    fun fromDtoToUser(source: UserDto): User {
        return User(
            id = source.id,
            displayName = source.displayName,
            email = source.email,
            role = source.role,
            status = source.status
        )
    }
}
