package com.chauret.api.request

import kotlinx.serialization.Serializable

@Serializable
sealed class IngredientGuidOrName {
    data class Guid(val guid: String) : IngredientGuidOrName()
    data class Name(val name: String) : IngredientGuidOrName()
}

@Serializable
data class DrinkIngredientRequest(
    // TODO:  one of ingredientGuid or name should be required
    val ingredientGuidOrName: IngredientGuidOrName,
//    val ingredientGuid: String,
    val amount: Float,
    val unit: String? = null
)

@Serializable
data class DrinkRequest(
    val name: String,
    val ingredients: List<DrinkIngredientRequest> = emptyList(),
    val instructions: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val liked: Boolean = false,
    val imagePath: String? = null,
    val glass: String? = null,
    val ibaCategory: String? = null
)

@Serializable
data class BulkDrinkRequest(
    val drinks: List<DrinkRequest>
)
