package ru.itplanet.trampline.moderation.dao

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.itplanet.trampline.commons.model.moderation.ModerationEntityType
import ru.itplanet.trampline.commons.model.moderation.ModerationTaskType
import ru.itplanet.trampline.moderation.dao.dto.ModerationTaskDto
import ru.itplanet.trampline.moderation.model.ModerationTaskStatus

interface ModerationTaskDao : JpaRepository<ModerationTaskDto, Long>, JpaSpecificationExecutor<ModerationTaskDto> {

    fun countByStatus(status: ModerationTaskStatus): Long

    fun countByStatusAndAssigneeUser_Id(status: ModerationTaskStatus, assigneeUserId: Long): Long

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
    select m
    from ModerationTaskDto m
    where m.id = :taskId
    """
    )
    fun findByIdForUpdate(@Param("taskId") taskId: Long): ModerationTaskDto?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        select m
        from ModerationTaskDto m
        where m.entityType = :entityType
          and m.entityId = :entityId
          and m.taskType = :taskType
          and m.status in :statuses
        order by m.createdAt asc, m.id asc
        """
    )
    fun findActiveByKeyForUpdate(
        @Param("entityType") entityType: ModerationEntityType,
        @Param("entityId") entityId: Long,
        @Param("taskType") taskType: ModerationTaskType,
        @Param("statuses") statuses: Collection<ModerationTaskStatus>,
    ): List<ModerationTaskDto>

    @Query(
        """
        select m
        from ModerationTaskDto m
        where m.entityType = :entityType
          and m.entityId = :entityId
          and m.taskType = :taskType
          and m.status in :statuses
        order by m.createdAt asc, m.id asc
        """
    )
    fun findActiveByKey(
        @Param("entityType") entityType: ModerationEntityType,
        @Param("entityId") entityId: Long,
        @Param("taskType") taskType: ModerationTaskType,
        @Param("statuses") statuses: Collection<ModerationTaskStatus>,
    ): List<ModerationTaskDto>

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
