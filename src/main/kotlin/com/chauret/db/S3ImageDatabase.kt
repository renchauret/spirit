package com.chauret.db

import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.util.Base64

open class S3ImageDatabase constructor(name: String): ImageDatabase {

    private val bucketName = "spirit-$name-images"

    private val client = S3Client.builder()
        .region(Region.US_EAST_2)
        .credentialsProvider(
            ProfileCredentialsProvider.builder()
            .profileName("spirit-backend")
            .build()
        )
        .build()
    override fun get(key: String): ByteArray? {
        client.getObject {
            it.bucket(bucketName)
            it.key(key)
        }.use {
            return it.readAllBytes()
        }
    }

    override fun create(key: String, imageBase64: String) {
        val imageBytes = Base64.getDecoder().decode(imageBase64)
        client.putObject(
            PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType("image/jpeg")
                .contentLength(imageBytes.size.toLong())
                .build(),
            RequestBody.fromBytes(imageBytes)
        )
    }

    override fun delete(key: String) {
        client.deleteObject {
            it.bucket(bucketName)
            it.key(key)
        }
    }

}