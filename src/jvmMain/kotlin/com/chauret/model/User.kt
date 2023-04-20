package com.chauret.model

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey

@DynamoDbBean
data class User(
    @get:DynamoDbPartitionKey
    var username: String? = null,
    var encodedPassword: String? = null,
    var permissions: Permissions = Permissions.USER
)
