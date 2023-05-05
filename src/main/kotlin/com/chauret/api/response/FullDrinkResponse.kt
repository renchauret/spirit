package com.chauret.api.response

import kotlinx.serialization.Serializable

@Serializable
data class FullDrinkIngredientResponse(
    val ingredientGuid: String,
    val amount: Float?,
    val unit: String?,
    val ingredientName: String = "",
    val description: String?,
    val liked: Boolean = false,
    val type: String? = null,
    val imageUrl: String? = null,
    val alcoholic: Boolean? = null,
    val abv: Float? = null
)

@Serializable
data class FullDrinkResponse(
    val guid: String,
    val username: String,
    val name: String,
    val ingredients: List<FullDrinkIngredientResponse>,
    val instructions: List<String>,
    val tags: List<String>,
    val imageUrl: String?,
    val description: String?,
    val glass: String?,
    val ibaCategory: String?,
    val liked: Boolean
)
