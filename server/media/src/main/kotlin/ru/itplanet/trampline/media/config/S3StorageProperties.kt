package ru.itplanet.trampline.media.config

import jakarta.validation.constraints.NotBlank
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated
import java.net.URI
import java.time.Duration

@Validated
@ConfigurationProperties(prefix = "storage.s3")
data class S3StorageProperties(
    var endpoint: URI = URI.create("https://s3.twcstorage.ru"),

    @field:NotBlank(message = "Регион S3-хранилища обязателен")
    var region: String = "ru-1",

    @field:NotBlank(message = "Имя S3-бакета обязательно")
    var bucket: String = "",

    @field:NotBlank(message = "Access key для S3 обязателен")
    var accessKey: String = "",

    @field:NotBlank(message = "Secret key для S3 обязателен")
    var secretKey: String = "",

    var keyPrefix: String = "trampline",
    var pathStyleAccessEnabled: Boolean = true,
    var connectTimeout: Duration = Duration.ofSeconds(5),
    var readTimeout: Duration = Duration.ofSeconds(30),
    var presignedUrlTtl: Duration = Duration.ofMinutes(15),
)
