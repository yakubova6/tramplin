package ru.itplanet.trampline.media.service

import org.springframework.stereotype.Service
import ru.itplanet.trampline.media.config.S3StorageProperties
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class S3ObjectStorage(
    private val s3Client: S3Client,
    private val s3Presigner: S3Presigner,
    private val properties: S3StorageProperties,
) : ObjectStorage {

    override fun putObject(
        key: String,
        bytes: ByteArray,
        contentType: String,
        metadata: Map<String, String>,
    ) {
        val request = PutObjectRequest.builder()
            .bucket(properties.bucket)
            .key(normalizeKey(key))
            .contentType(contentType)
            .metadata(metadata)
            .build()

        s3Client.putObject(request, RequestBody.fromBytes(bytes))
    }

    override fun deleteObject(key: String) {
        val request = DeleteObjectRequest.builder()
            .bucket(properties.bucket)
            .key(normalizeKey(key))
            .build()

        s3Client.deleteObject(request)
    }

    override fun generateDownloadUrl(key: String): ObjectStorage.PresignedUrl {
        val normalizedKey = normalizeKey(key)
        val expiresAt = OffsetDateTime.now(ZoneOffset.UTC).plus(properties.presignedUrlTtl)

        val getObjectRequest = GetObjectRequest.builder()
            .bucket(properties.bucket)
            .key(normalizedKey)
            .build()

        val presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(properties.presignedUrlTtl)
            .getObjectRequest(getObjectRequest)
            .build()

        val presignedRequest = s3Presigner.presignGetObject(presignRequest)

        return ObjectStorage.PresignedUrl(
            url = presignedRequest.url().toString(),
            expiresAt = expiresAt,
        )
    }

    private fun normalizeKey(key: String): String {
        return key.trimStart('/')
    }
}
