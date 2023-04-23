package com.chauret.api.response

import kotlinx.serialization.Serializable

@Serializable
class IngredientResponse(
    val guid: String,
    val username: String,
    val name: String,
    val imagePath: String?,
    val type: String?,
    val liked: Boolean,
)
