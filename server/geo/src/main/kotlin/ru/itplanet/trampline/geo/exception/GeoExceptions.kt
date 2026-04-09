package ru.itplanet.trampline.geo.exception

import org.springframework.http.HttpStatus
import ru.itplanet.trampline.commons.exception.ApiException

class GeoBadRequestException(
    message: String,
    code: String = "geo_bad_request",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.BAD_REQUEST,
    code = code,
    message = message,
    details = details,
)

class GeoForbiddenException(
    message: String,
    code: String = "geo_forbidden",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.FORBIDDEN,
    code = code,
    message = message,
    details = details,
)

class GeoNotFoundException(
    message: String,
    code: String = "geo_not_found",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.NOT_FOUND,
    code = code,
    message = message,
    details = details,
)

class GeoIntegrationException(
    message: String,
    code: String = "geo_integration_failed",
    details: Map<String, String> = emptyMap(),
) : ApiException(
    status = HttpStatus.BAD_GATEWAY,
    code = code,
    message = message,
    details = details,
)
