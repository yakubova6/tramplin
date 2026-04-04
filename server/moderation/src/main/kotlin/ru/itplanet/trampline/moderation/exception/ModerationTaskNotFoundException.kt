package ru.itplanet.trampline.moderation.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class ModerationTaskNotFoundException(taskId: Long) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = "moderation_task_not_found",
    message = "Задача модерации с идентификатором $taskId не найдена",
)
