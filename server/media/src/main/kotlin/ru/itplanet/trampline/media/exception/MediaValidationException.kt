package ru.itplanet.trampline.media.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class MediaValidationException(
    message: String,
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = "validation_error",
    message = message,
    details = details,
)
