package com.chauret.api.request

import kotlinx.serialization.Serializable

@Serializable
data class DrinkIngredientRequest(
    val ingredientGuid: String,
    val amount: Float,
    val unit: String? = null
)

@Serializable
data class DrinkRequest(
    val name: String,
    val ingredients: List<DrinkIngredientRequest> = emptyList(),
    val instructions: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val imagePath: String? = null,
    val glass: String? = null,
    val ibaCategory: String? = null
)
