package ru.itplanet.trampline.moderation.exception

import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

class ModerationTaskNotFoundException(taskId: Long) :
    ResponseStatusException(
        HttpStatus.NOT_FOUND,
        "Moderation task with id=$taskId not found"
    )
