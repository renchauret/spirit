package com.chauret.model.recipe

import com.chauret.model.Permissions
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey
import java.util.UUID

@DynamoDbBean
data class Ingredient(
    @get:DynamoDbSortKey
    val guid: UUID = UUID.randomUUID(),
    @get:DynamoDbPartitionKey
    val username: String = Permissions.ADMIN.name,
    val name: String = "",
    val imagePath: String? = null
)
