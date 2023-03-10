package com.chauret.model.recipe

import com.chauret.model.Permissions
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey
import java.util.UUID

@DynamoDbBean
data class Drink (
    @get:DynamoDbSortKey
    override val guid: UUID = UUID.randomUUID(),
    @get:DynamoDbPartitionKey
    override val username: String = Permissions.ADMIN.name,
    override val name: String = "",
    override val ingredients: Map<String, Pair<Float, String>> = emptyMap(),
    override val instructions: List<String> = emptyList(),
    override val tags: List<String> = emptyList(),
    override val imagePath: String? = null,
    val glass: String? = null,
    val ibaCategory: String? = null
): Recipe
