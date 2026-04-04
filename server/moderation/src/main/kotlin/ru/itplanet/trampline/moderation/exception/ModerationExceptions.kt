package ru.itplanet.trampline.moderation.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class ModerationBadRequestException(
    message: String,
    code: String = "moderation_bad_request",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = code,
    message = message,
    details = details,
)

class ModerationForbiddenException(
    message: String,
    code: String = "moderation_forbidden",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = code,
    message = message,
    details = details,
)

class ModerationNotFoundException(
    message: String,
    code: String = "moderation_resource_not_found",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = code,
    message = message,
    details = details,
)

class ModerationConflictException(
    message: String,
    code: String = "moderation_conflict",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.CONFLICT,
    code = code,
    message = message,
    details = details,
)

class ModerationIntegrationException(
    message: String,
    code: String = "moderation_integration_error",
    status: HttpStatus = HttpStatus.SERVICE_UNAVAILABLE,
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = status,
    code = code,
    message = message,
    details = details,
)
