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
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest

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
        val normalizedKey = normalizeKey(key)

        val request = PutObjectRequest.builder()
            .bucket(properties.bucket)
            .key(normalizedKey)
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

    override fun generatePresignedGetUrl(key: String): String {
        val objectRequest = GetObjectRequest.builder()
            .bucket(properties.bucket)
            .key(normalizeKey(key))
            .build()

        val presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(properties.presignedUrlTtl)
            .getObjectRequest(objectRequest)
            .build()

        return s3Presigner.presignGetObject(presignRequest)
            .url()
            .toString()
    }

    override fun generatePresignedPutUrl(key: String): String {
        val objectRequest = PutObjectRequest.builder()
            .bucket(properties.bucket)
            .key(normalizeKey(key))
            .build()

        val presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(properties.presignedUrlTtl)
            .putObjectRequest(objectRequest)
            .build()

        return s3Presigner.presignPutObject(presignRequest)
            .url()
            .toString()
    }

    private fun normalizeKey(key: String): String {
        return key.trimStart('/')
    }
}
