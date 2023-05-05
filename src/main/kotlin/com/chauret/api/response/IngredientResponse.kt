package com.chauret.api.response

import kotlinx.serialization.Serializable

@Serializable
data class IngredientResponse(
    val guid: String,
    val username: String,
    val name: String,
    var description: String?,
    val imageUrl: String?,
    val type: String?,
    val liked: Boolean,
    val alcoholic: Boolean?,
    val abv: Float?
)
