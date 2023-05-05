package com.chauret.model.recipe

import com.chauret.model.Permissions
import java.util.*

data class FullDrinkIngredient(
    override val ingredientGuid: UUID = UUID.fromString("00000000-0000-0000-0000-000000000000"),
    override val amount: Float? = null,
    override val unit: String? = null,
    val ingredientName: String = "",
    val description: String? = null,
    val liked: Boolean = false,
    val type: IngredientType? = null,
    val imagePath: String? = null,
    val alcoholic: Boolean? = null,
    val abv: Float? = null
) : RecipeIngredient

data class FullDrink(
    override val username: String = Permissions.ADMIN.name,
    override val guid: UUID = UUID.randomUUID(),
    override val drinkName: String = "",
    override val ingredients: List<FullDrinkIngredient> = emptyList(),
    override val instructions: List<String> = emptyList(),
    override val tags: List<String> = emptyList(),
    override val liked: Boolean = false,
    override val imageUrl: String? = null,
    override val description: String? = null,
    val glass: String? = null,
    val ibaCategory: String? = null
) : Recipe
