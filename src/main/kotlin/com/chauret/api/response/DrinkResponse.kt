package com.chauret.api.response

import kotlinx.serialization.Serializable

@Serializable
data class DrinkIngredientResponse(
    val ingredientGuid: String,
    val amount: Float?,
    val unit: String?
)

@Serializable
data class DrinkResponse(
    val guid: String,
    val username: String,
    val name: String,
    val ingredients: List<DrinkIngredientResponse>,
    val instructions: List<String>,
    val tags: List<String>,
    val imageUrl: String?,
    val description: String?,
    val glass: String?,
    val ibaCategory: String?,
    val liked: Boolean
)
