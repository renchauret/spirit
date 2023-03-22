package com.chauret.api.response

import com.chauret.model.recipe.Drink
import com.chauret.model.recipe.DrinkIngredient

class DrinkIngredientResponse(model: DrinkIngredient) {
    val ingredientGuid: String = model.ingredientGuid.toString()
    val amount: Float = model.amount
    val unit: String? = model.unit
}

class DrinkResponse(model: Drink) {
    val guid: String = model.guid.toString()
    val username: String = model.username
    val name: String = model.name
    val ingredients: List<DrinkIngredientResponse> = model.ingredients.map { DrinkIngredientResponse(it) }
    val instructions: List<String> = model.instructions
    val tags: List<String> = model.tags
    val imagePath: String? = model.imagePath
    val glass: String? = model.glass
    val ibaCategory: String? = model.ibaCategory
    val liked: Boolean = model.liked
}
