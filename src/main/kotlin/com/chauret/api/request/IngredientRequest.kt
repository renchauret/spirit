package com.chauret.api.request

import com.chauret.model.recipe.IngredientType
import kotlinx.serialization.Serializable

@Serializable
data class IngredientRequest(
    val name: String,
    val liked: Boolean = false,
    val description: String? = null,
    val type: IngredientType? = null,
    val image: ImageRequest? = null,
    val alcoholic: Boolean? = null,
    val abv: Float? = null
)

@Serializable
data class BulkIngredientRequest(
    val ingredients: List<IngredientRequest>
)
