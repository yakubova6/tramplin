package ru.itplanet.trampline.media.service

interface ObjectStorage {

    fun putObject(
        key: String,
        bytes: ByteArray,
        contentType: String,
        metadata: Map<String, String> = emptyMap(),
    )

    fun deleteObject(key: String)

    fun generatePresignedGetUrl(key: String): String

    fun generatePresignedPutUrl(key: String): String
}
