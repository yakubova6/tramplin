package ru.itplanet.trampline.auth.service

import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import ru.itplanet.trampline.auth.client.ModerationAdminClient
import ru.itplanet.trampline.auth.converter.UserConverter
import ru.itplanet.trampline.auth.exception.UserAlreadyExistsException
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.CreateCuratorRequest
import ru.itplanet.trampline.auth.model.request.GetCuratorsRequest
import ru.itplanet.trampline.auth.model.request.UpdateCuratorAccessRequest
import ru.itplanet.trampline.auth.model.response.CuratorDetailResponse
import ru.itplanet.trampline.auth.model.response.CuratorListItemResponse
import ru.itplanet.trampline.auth.model.response.CuratorModerationStatsResponse
import ru.itplanet.trampline.auth.model.response.CuratorPageResponse
import ru.itplanet.trampline.auth.util.EmailNormalizer
import ru.itplanet.trampline.commons.dao.UserDao
import ru.itplanet.trampline.commons.dao.dto.UserDto
import ru.itplanet.trampline.commons.model.Role
import ru.itplanet.trampline.commons.model.moderation.InternalCuratorModerationStatsResponse
import java.time.Instant

@Service
class AdminServiceImpl(
    private val userDao: UserDao,
    private val userConverter: UserConverter,
    private val passwordEncoder: PasswordEncoder,
    private val emailNormalizer: EmailNormalizer,
    private val sessionService: SessionService,
    private val moderationAdminClient: ModerationAdminClient,
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

    @Transactional(readOnly = true)
    override fun getCurators(request: GetCuratorsRequest): CuratorPageResponse {
        val normalizedSearch = request.search
            ?.trim()
            ?.takeIf { it.isNotEmpty() }

        val users = userDao.findCuratorAccounts(
            search = normalizedSearch,
            limit = request.limit,
            offset = request.offset,
        )

        val total = userDao.countCuratorAccounts(
            search = normalizedSearch,
        )

        return CuratorPageResponse(
            items = users.map(::toCuratorListItemResponse),
            limit = request.limit,
            offset = request.offset,
            total = total,
        )
    }

    @Transactional(readOnly = true)
    override fun getCuratorDetail(curatorId: Long): CuratorDetailResponse {
        val user = loadCuratorManagementAccount(curatorId)

        return toCuratorDetailResponse(
            user = user,
            stats = loadCuratorStats(user.id ?: error("User id must not be null")),
        )
    }

    @Transactional
    override fun updateCuratorAccess(
        actorUserId: Long,
        curatorId: Long,
        request: UpdateCuratorAccessRequest,
    ): CuratorDetailResponse {
        if (actorUserId == curatorId) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Administrator cannot change own access",
            )
        }

        val user = userDao.findByIdForUpdate(curatorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Curator not found")

        if (user.role != Role.CURATOR) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only curator account access can be changed",
            )
        }

        if (user.isActive == request.active) {
            return toCuratorDetailResponse(
                user = user,
                stats = loadCuratorStats(user.id ?: error("User id must not be null")),
            )
        }

        val normalizedReason = request.reason
            ?.trim()
            ?.takeIf { it.isNotEmpty() }

        if (!request.active && normalizedReason == null) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Reason is required when deactivating curator",
            )
        }

        if (request.active) {
            user.isActive = true
            user.deactivatedAt = null
            user.deactivatedByUserId = null
            user.deactivationReason = null
        } else {
            user.isActive = false
            user.deactivatedAt = Instant.now()
            user.deactivatedByUserId = actorUserId
            user.deactivationReason = normalizedReason
        }

        val savedUser = userDao.saveAndFlush(user)

        if (!savedUser.isActive) {
            sessionService.deleteAllSessionsByUserId(
                savedUser.id ?: error("User id must not be null"),
            )
        }

        return toCuratorDetailResponse(
            user = savedUser,
            stats = loadCuratorStats(savedUser.id ?: error("User id must not be null")),
        )
    }

    private fun loadCuratorManagementAccount(
        curatorId: Long,
    ): UserDto {
        val user = userDao.findById(curatorId)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Curator not found")
            }

        if (user.role != Role.CURATOR && user.role != Role.ADMIN) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Curator not found")
        }

        return user
    }

    private fun loadCuratorStats(
        userId: Long,
    ): CuratorModerationStatsResponse {
        return try {
            moderationAdminClient.getCuratorStats(userId).toResponse()
        } catch (ex: Exception) {
            logger.warn("Failed to load moderation stats for user {}", userId, ex)
            CuratorModerationStatsResponse()
        }
    }

    private fun toCuratorListItemResponse(
        user: UserDto,
    ): CuratorListItemResponse {
        return CuratorListItemResponse(
            id = user.id ?: error("User id must not be null"),
            displayName = user.displayName,
            email = user.email,
            twoFactorEnabled = user.twoFactorEnabled,
            lastLoginAt = user.lastLoginAt,
            role = user.role,
            isActive = user.isActive,
        )
    }

    private fun toCuratorDetailResponse(
        user: UserDto,
        stats: CuratorModerationStatsResponse,
    ): CuratorDetailResponse {
        return CuratorDetailResponse(
            id = user.id ?: error("User id must not be null"),
            displayName = user.displayName,
            email = user.email,
            role = user.role,
            twoFactorEnabled = user.twoFactorEnabled,
            lastLoginAt = user.lastLoginAt,
            isActive = user.isActive,
            deactivatedAt = user.deactivatedAt,
            deactivatedByUserId = user.deactivatedByUserId,
            deactivationReason = user.deactivationReason,
            stats = stats,
        )
    }

    private fun InternalCuratorModerationStatsResponse.toResponse(): CuratorModerationStatsResponse {
        return CuratorModerationStatsResponse(
            openAssignedCount = openAssignedCount,
            inProgressCount = inProgressCount,
            approvedCount = approvedCount,
            rejectedCount = rejectedCount,
            cancelledCount = cancelledCount,
            lastModerationActionAt = lastModerationActionAt,
        )
    }

    private companion object {
        private val logger = LoggerFactory.getLogger(AdminServiceImpl::class.java)
    }
}
