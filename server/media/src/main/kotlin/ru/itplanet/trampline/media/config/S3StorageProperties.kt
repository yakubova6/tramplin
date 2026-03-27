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
    @field:NotBlank
    var region: String = "ru-1",
    @field:NotBlank
    var bucket: String = "",
    @field:NotBlank
    var accessKey: String = "",
    @field:NotBlank
    var secretKey: String = "",
    var keyPrefix: String = "trampline",
    var pathStyleAccessEnabled: Boolean = true,
    var connectTimeout: Duration = Duration.ofSeconds(5),
    var readTimeout: Duration = Duration.ofSeconds(30),
    var presignedUrlTtl: Duration = Duration.ofMinutes(15),
)
