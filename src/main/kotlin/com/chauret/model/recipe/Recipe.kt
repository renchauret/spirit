package com.chauret.model.recipe

import java.util.UUID

interface RecipeIngredient {
    val ingredientGuid: UUID
    val amount: Float
    val unit: String?
}

interface Recipe {
    val guid: UUID
    // the user who owns this recipe
    val username: String
    val name: String
    // map of ingredient names to (quantity, unit)
    val ingredients: List<RecipeIngredient>
    val instructions: List<String>
    val tags: List<String>
    val imagePath: String?
}