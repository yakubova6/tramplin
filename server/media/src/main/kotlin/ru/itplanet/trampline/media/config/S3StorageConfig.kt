package ru.itplanet.trampline.media.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.S3Configuration
import software.amazon.awssdk.services.s3.presigner.S3Presigner

@Configuration
@EnableConfigurationProperties(S3StorageProperties::class)
class S3StorageConfig(
    private val properties: S3StorageProperties,
) {

    @Bean
    fun s3ServiceConfiguration(): S3Configuration {
        return S3Configuration.builder()
            .pathStyleAccessEnabled(properties.pathStyleAccessEnabled)
            .checksumValidationEnabled(false)
            .build()
    }

    @Bean
    fun s3Client(s3ServiceConfiguration: S3Configuration): S3Client {
        val credentialsProvider = StaticCredentialsProvider.create(
            AwsBasicCredentials.create(properties.accessKey, properties.secretKey)
        )

        return S3Client.builder()
            .region(Region.of(properties.region))
            .endpointOverride(properties.endpoint)
            .credentialsProvider(credentialsProvider)
            .serviceConfiguration(s3ServiceConfiguration)
            .httpClient(
                UrlConnectionHttpClient.builder()
                    .connectionTimeout(properties.connectTimeout)
                    .socketTimeout(properties.readTimeout)
                    .build()
            )
            .build()
    }

    @Bean
    fun s3Presigner(s3ServiceConfiguration: S3Configuration): S3Presigner {
        val credentialsProvider = StaticCredentialsProvider.create(
            AwsBasicCredentials.create(properties.accessKey, properties.secretKey)
        )

        return S3Presigner.builder()
            .region(Region.of(properties.region))
            .endpointOverride(properties.endpoint)
            .credentialsProvider(credentialsProvider)
            .serviceConfiguration(s3ServiceConfiguration)
            .build()
    }
}
