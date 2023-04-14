package com.chauret.api.response

import com.chauret.model.recipe.Ingredient

class IngredientResponse(model: Ingredient) {
    val guid: String = model.guid.toString()
    val username: String = model.username
    val name: String = model.name
    val imagePath: String? = model.imagePath
    val type: String? = model.type?.name
    val liked: Boolean = model.liked
}
