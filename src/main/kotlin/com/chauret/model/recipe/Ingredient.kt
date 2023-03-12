package com.chauret.model.recipe

import com.chauret.model.Permissions
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey
import java.util.UUID

enum class IngredientType {
    BITTERS,
    FRUIT,
    GARNISH,
    JUICE,
    LIQUEUR,
    SODA,
    SPIRIT,
    FORTIFIED_WINE,
    WINE,
    OTHER_ALCOHOL,
    OTHER
}

@DynamoDbBean
data class Ingredient(
    @get:DynamoDbSortKey
    val guid: UUID = UUID.randomUUID(),
    @get:DynamoDbPartitionKey
    val username: String = Permissions.ADMIN.name,
    val name: String = "",
    var type: IngredientType? = null,
    val imagePath: String? = null
)
