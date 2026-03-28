package ru.itplanet.trampline.media.config

import jakarta.validation.constraints.Positive
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component
import org.springframework.validation.annotation.Validated
import java.time.Duration

@Component
@Validated
@ConfigurationProperties(prefix = "media.cleanup")
data class FileCleanupProperties(
    var enabled: Boolean = true,
    @field:Positive
    var batchSize: Int = 50,
    var deletedFileMinAge: Duration = Duration.ofMinutes(10),
    var fixedDelay: Duration = Duration.ofMinutes(30),
)
