package ru.itplanet.trampline.moderation.dao

import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.moderation.dao.dto.ModerationLogDto
import ru.itplanet.trampline.moderation.model.ModerationLogAction

interface ModerationLogDao : JpaRepository<ModerationLogDto, Long> {

    fun findByTaskIdOrderByCreatedAtAscIdAsc(taskId: Long): List<ModerationLogDto>

    fun findByTaskIdInAndActionOrderByTaskIdAscCreatedAtAscIdAsc(
        taskIds: Collection<Long>,
        action: ModerationLogAction
    ): List<ModerationLogDto>

    fun findByEntityTypeAndEntityIdOrderByCreatedAtAscIdAsc(
        entityType: ModerationEntityType,
        entityId: Long
    ): List<ModerationLogDto>

    fun findFirstByActorUser_IdOrderByCreatedAtDescIdDesc(
        actorUserId: Long,
    ): ModerationLogDto?
}
