package ru.itplanet.trampline.auth.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.auth.converter.UserConverter
import ru.itplanet.trampline.auth.dao.UserDao
import ru.itplanet.trampline.auth.exception.UserAlreadyExistsException
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.CreateCuratorRequest
import ru.itplanet.trampline.auth.util.EmailNormalizer
import java.util.Locale

@Service
class AdminServiceImpl(
    private val userDao: UserDao,
    private val userConverter: UserConverter,
    private val passwordEncoder: PasswordEncoder,
    private val emailNormalizer: EmailNormalizer,
) : AdminService {

    @Transactional
    override fun createCurator(request: CreateCuratorRequest): User {
        val normalizedEmail = emailNormalizer.normalize(request.email)

        if (userDao.findByEmail(normalizedEmail) != null) {
            throw UserAlreadyExistsException()
        }

        val userToSave = userConverter.toCuratorUserDto(
            source = request,
            normalizedEmail = normalizedEmail,
            passwordHash = passwordEncoder.encode(request.password)
        )

        val savedUser = try {
            userDao.save(userToSave)
        } catch (_: DataIntegrityViolationException) {
            throw UserAlreadyExistsException()
        }

        return userConverter.fromDtoToUser(savedUser)
    }
}
