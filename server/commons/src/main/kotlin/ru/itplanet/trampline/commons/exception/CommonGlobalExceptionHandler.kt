package ru.itplanet.trampline.commons.exception

import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.core.convert.ConversionFailedException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.validation.BindException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.multipart.support.MissingServletRequestPartException
import org.springframework.web.server.ResponseStatusException

@RestControllerAdvice
class CommonGlobalExceptionHandler {

    @ExceptionHandler(ApiException::class)
    fun handleApiException(ex: ApiException): ResponseEntity<ApiError> {
        return buildResponse(
            status = ex.status,
            message = ex.message,
            details = ex.details,
            code = ex.code,
        )
    }

    @ExceptionHandler(BindException::class)
    fun handleBindException(ex: BindException): ResponseEntity<ApiError> {
        val details = ex.bindingResult.fieldErrors.associate { error ->
            error.field to (error.defaultMessage ?: "Некорректное значение")
        }

        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Ошибка валидации параметров запроса",
            details = details,
            code = "validation_error",
        )
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleMethodArgumentTypeMismatch(ex: MethodArgumentTypeMismatchException): ResponseEntity<ApiError> {
        val parameterName = ex.name
        val parameterValue = ex.value?.toString() ?: "null"
        val expectedType = ex.requiredType?.simpleName ?: "неизвестно"

        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Некорректное значение параметра \"$parameterName\"",
            details = mapOf(
                "parameter" to parameterName,
                "value" to parameterValue,
                "expectedType" to expectedType,
            ),
            code = "validation_error",
        )
    }

    @ExceptionHandler(ConversionFailedException::class)
    fun handleConversionFailed(): ResponseEntity<ApiError> {
        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Не удалось преобразовать значение параметра запроса",
            code = "validation_error",
        )
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException): ResponseEntity<ApiError> {
        val details = ex.constraintViolations.associate { violation ->
            violation.propertyPath.toString() to violation.message
        }

        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Ошибка валидации запроса",
            details = details,
            code = "validation_error",
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleMethodArgumentNotValid(ex: MethodArgumentNotValidException): ResponseEntity<ApiError> {
        val details = ex.bindingResult.fieldErrors.associate { error ->
            error.field to (error.defaultMessage ?: "Некорректное значение")
        }

        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Ошибка валидации тела запроса",
            details = details,
            code = "validation_error",
        )
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleHttpMessageNotReadable(): ResponseEntity<ApiError> {
        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Тело запроса заполнено некорректно или не полностью",
            code = "invalid_request",
        )
    }

    @ExceptionHandler(
        MissingServletRequestPartException::class,
        MissingServletRequestParameterException::class,
    )
    fun handleMissingMultipartData(): ResponseEntity<ApiError> {
        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Запрос заполнен некорректно или не полностью",
            code = "invalid_request",
        )
    }

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleMaxUploadSizeExceeded(): ResponseEntity<ApiError> {
        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Размер загружаемого файла превышает допустимый лимит",
            code = "file_too_large",
        )
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(ex: IllegalArgumentException): ResponseEntity<ApiError> {
        return buildResponse(
            status = HttpStatus.BAD_REQUEST,
            message = ex.message?.takeIf { it.isNotBlank() } ?: "Переданы некорректные аргументы",
            code = "validation_error",
        )
    }

    @ExceptionHandler(IllegalStateException::class)
    fun handleIllegalState(ex: IllegalStateException): ResponseEntity<ApiError> {
        logger.error("Некорректное состояние приложения при обработке запроса", ex)

        return buildResponse(
            status = HttpStatus.INTERNAL_SERVER_ERROR,
            message = ex.message?.takeIf { it.isNotBlank() } ?: "Внутренняя ошибка сервера",
            code = "internal_error",
        )
    }

    @ExceptionHandler(ResponseStatusException::class)
    fun handleResponseStatus(ex: ResponseStatusException): ResponseEntity<ApiError> {
        val status = HttpStatus.valueOf(ex.statusCode.value())

        return buildResponse(
            status = status,
            message = ex.reason?.takeIf { it.isNotBlank() } ?: status.reasonPhrase,
            code = "request_failed",
        )
    }

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun handleDataIntegrityViolation(): ResponseEntity<ApiError> {
        return buildResponse(
            status = HttpStatus.CONFLICT,
            message = "Операция нарушает ограничения данных",
            code = "data_integrity_violation",
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ResponseEntity<ApiError> {
        logger.error("Непредвиденная ошибка при обработке запроса", ex)

        return buildResponse(
            status = HttpStatus.INTERNAL_SERVER_ERROR,
            message = "Внутренняя ошибка сервера",
            code = "internal_error",
        )
    }

    private fun buildResponse(
        status: HttpStatus,
        message: String,
        details: Map<String, String> = emptyMap(),
        code: String? = null,
    ): ResponseEntity<ApiError> {
        return ResponseEntity
            .status(status)
            .body(
                ApiErrorFactory.create(
                    status = status,
                    message = message,
                    details = details,
                    code = code,
                ),
            )
    }

    companion object {
        private val logger = LoggerFactory.getLogger(CommonGlobalExceptionHandler::class.java)
    }
}
