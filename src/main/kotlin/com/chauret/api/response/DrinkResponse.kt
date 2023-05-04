package com.chauret.api.response

import kotlinx.serialization.Serializable

@Serializable
class DrinkIngredientResponse(
    val ingredientGuid: String,
    val amount: Float?,
    val unit: String?
)

@Serializable
class DrinkResponse(
    val guid: String,
    val username: String,
    val name: String,
    val ingredients: List<DrinkIngredientResponse>,
    val instructions: List<String>,
    val tags: List<String>,
    val imagePath: String?,
    val glass: String?,
    val ibaCategory: String?,
    val liked: Boolean
)