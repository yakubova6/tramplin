package ru.itplanet.trampline.moderation.dao

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus

interface ModerationTaskDao : JpaRepository<ModerationTaskDto, Long>, JpaSpecificationExecutor<ModerationTaskDto> {

    fun countByStatus(status: ModerationTaskStatus): Long

    fun countByStatusAndAssigneeUser_Id(status: ModerationTaskStatus, assigneeUserId: Long): Long

    @Query(
        """
        select m.entityType as entityType, count(m) as count
        from ModerationTaskDto m
        where m.status in :statuses
        group by m.entityType
        """
    )
    fun countActiveByEntityType(statuses: Collection<ModerationTaskStatus>): List<EntityTypeCountProjection>

    @Query(
        """
        select m.priority as priority, count(m) as count
        from ModerationTaskDto m
        where m.status in :statuses
        group by m.priority
        """
    )
    fun countActiveByPriority(statuses: Collection<ModerationTaskStatus>): List<PriorityCountProjection>
}
