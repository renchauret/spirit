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
    var guid: UUID = UUID.randomUUID(),
    @get:DynamoDbPartitionKey
    var username: String = Permissions.ADMIN.name,
    var ingredientName: String = "",
    var liked: Boolean = false,
    var description: String? = null,
    var type: String? = null,
    var imageUrl: String? = null,
    var alcoholic: Boolean? = null,
    var abv: Float? = null
)
