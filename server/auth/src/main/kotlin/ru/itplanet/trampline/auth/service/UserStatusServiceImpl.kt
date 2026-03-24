package ru.itplanet.trampline.auth.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.auth.converter.UserConverter
import ru.itplanet.trampline.auth.dao.UserDao
import ru.itplanet.trampline.auth.exception.UserNotFoundException
import ru.itplanet.trampline.auth.model.Status
import ru.itplanet.trampline.auth.model.User
import ru.itplanet.trampline.auth.model.request.InternalUpdateUserStatusRequest
import ru.itplanet.trampline.auth.util.UserStatusRules

@Service
class UserStatusServiceImpl(
    private val userDao: UserDao,
    private val userConverter: UserConverter,
    private val userStatusRules: UserStatusRules,
    private val sessionService: SessionService
) : UserStatusService {

    @Transactional
    override fun updateStatus(
        targetUserId: Long,
        request: InternalUpdateUserStatusRequest
    ): User {
        val actor = userDao.findById(request.actorUserId)
            .orElseThrow { UserNotFoundException("Actor with id=${request.actorUserId} not found") }

        val target = userDao.findById(targetUserId)
            .orElseThrow { UserNotFoundException("User with id=$targetUserId not found") }

        userStatusRules.ensureActorCanChangeStatus(actor, target)

        if (target.status == request.status) {
            if (request.status == Status.BLOCKED || request.status == Status.DELETED) {
                sessionService.deleteAllSessionsByUserId(target.id!!)
            }
            return userConverter.fromDtoToUser(target)
        }

        userStatusRules.ensureTransitionAllowed(target, request.status)

        target.status = request.status
        val savedUser = userDao.save(target)

        if (savedUser.status == Status.BLOCKED || savedUser.status == Status.DELETED) {
            sessionService.deleteAllSessionsByUserId(savedUser.id!!)
        }

        return userConverter.fromDtoToUser(savedUser)
    }
}
