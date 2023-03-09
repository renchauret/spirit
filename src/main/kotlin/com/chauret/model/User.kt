package com.chauret.model

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import java.util.UUID

@DynamoDbBean
data class User(
    @get:DynamoDbPartitionKey
    var username: String? = null,
    var encodedPassword: String? = null,
    var sessionId: UUID? = null,
    var sessionExpirationTime: Long? = null
)
