package ru.itplanet.trampline.auth.util

import org.springframework.stereotype.Component
import ru.itplanet.trampline.auth.dao.dto.UserDto
import ru.itplanet.trampline.auth.exception.UserStatusChangeNotAllowedException
import ru.itplanet.trampline.auth.exception.UserStatusTransitionNotAllowedException
import ru.itplanet.trampline.auth.model.Role
import ru.itplanet.trampline.auth.model.Status

@Component
class UserStatusRules {

    fun ensureActorCanChangeStatus(
        actor: UserDto,
        target: UserDto
    ) {
        if (actor.status != Status.ACTIVE) {
            throw UserStatusChangeNotAllowedException("Only active curator or admin can change user status")
        }

        if (actor.role != Role.CURATOR && actor.role != Role.ADMIN) {
            throw UserStatusChangeNotAllowedException("Only curator or admin can change user status")
        }

        if (actor.id == target.id) {
            throw UserStatusChangeNotAllowedException("User cannot change own status")
        }

        if (target.role != Role.APPLICANT && target.role != Role.EMPLOYER) {
            throw UserStatusChangeNotAllowedException(
                "Only applicant or employer status can be changed by this operation"
            )
        }
    }

    fun ensureTransitionAllowed(
        target: UserDto,
        newStatus: Status
    ) {
        val allowed = when (target.role) {
            Role.APPLICANT -> isApplicantTransitionAllowed(target.status, newStatus)
            Role.EMPLOYER -> isEmployerTransitionAllowed(target.status, newStatus)
            else -> false
        }

        if (!allowed) {
            throw UserStatusTransitionNotAllowedException(
                "Transition ${target.status} -> $newStatus is not allowed for role ${target.role}"
            )
        }
    }

    private fun isApplicantTransitionAllowed(
        currentStatus: Status,
        newStatus: Status
    ): Boolean {
        return when (currentStatus) {
            Status.ACTIVE -> newStatus == Status.BLOCKED || newStatus == Status.DELETED
            Status.BLOCKED -> newStatus == Status.ACTIVE || newStatus == Status.DELETED
            else -> false
        }
    }

    private fun isEmployerTransitionAllowed(
        currentStatus: Status,
        newStatus: Status
    ): Boolean {
        return when (currentStatus) {
            Status.PENDING_VERIFICATION -> newStatus == Status.ACTIVE
            Status.ACTIVE -> newStatus == Status.BLOCKED || newStatus == Status.DELETED
            Status.BLOCKED -> newStatus == Status.ACTIVE
            else -> false
        }
    }
}
