package ru.itplanet.trampline.media.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class MediaNotFoundException(
    message: String,
    code: String = "media_resource_not_found",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = code,
    message = message,
    details = details,
)

class MediaConflictException(
    message: String,
    code: String = "media_conflict",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.CONFLICT,
    code = code,
    message = message,
    details = details,
)

class MediaIntegrationException(
    message: String,
    code: String = "media_integration_error",
    status: HttpStatus = HttpStatus.SERVICE_UNAVAILABLE,
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = status,
    code = code,
    message = message,
    details = details,
)
