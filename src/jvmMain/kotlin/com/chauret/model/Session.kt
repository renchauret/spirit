package com.chauret.model

import java.util.UUID
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey

@DynamoDbBean
data class Session(
    @get:DynamoDbPartitionKey
    var guid: UUID = UUID.randomUUID(),
    var username: String? = null,
    var expirationTimeSeconds: Long = System.currentTimeMillis() / 60 + (24 * 60 * 1000) // 24 hours from now
)
