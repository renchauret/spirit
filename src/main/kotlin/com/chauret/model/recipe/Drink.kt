package com.chauret.model.recipe

import com.chauret.model.Permissions
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey
import java.util.UUID

@DynamoDbBean
data class DrinkIngredient(
    override var ingredientGuid: UUID = UUID.fromString("00000000-0000-0000-0000-000000000000"),
    override var amount: Float? = null,
    override var unit: String? = null
): RecipeIngredient

@DynamoDbBean
data class Drink (
    @get:DynamoDbPartitionKey
    override var username: String = Permissions.ADMIN.name,
    @get:DynamoDbSortKey
    override var guid: UUID = UUID.randomUUID(),
    override var drinkName: String = "",
    override var ingredients: List<DrinkIngredient> = emptyList(),
    override var instructions: List<String> = emptyList(),
    override var tags: List<String> = emptyList(),
    override var liked: Boolean = false,
    override var imagePath: String? = null,
    var glass: String? = null,
    var ibaCategory: String? = null
): Recipe
