package com.chauret.api.response

class IngredientResponse(
    val guid: String,
    val username: String,
    val name: String,
    val imagePath: String?,
    val type: String?,
    val liked: Boolean,
)
