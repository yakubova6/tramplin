package ru.itplanet.trampline.commons.dao

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import ru.itplanet.trampline.commons.dao.dto.FileAssetDto
import ru.itplanet.trampline.commons.model.file.FileAssetStatus
import java.time.OffsetDateTime

interface FileAssetDao : JpaRepository<FileAssetDto, Long> {

    fun findAllByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
        status: FileAssetStatus,
        updatedAtBefore: OffsetDateTime,
        pageable: Pageable,
    ): List<FileAssetDto>
}
