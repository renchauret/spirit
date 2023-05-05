package com.chauret.api.response

import com.chauret.model.Session
import com.chauret.model.recipe.Drink
import com.chauret.model.recipe.FullDrink
import com.chauret.model.recipe.Ingredient

class ResponseFactory {
    companion object {
        fun createSessionResponse(model: Session): SessionResponse {
            return SessionResponse(
                token = model.guid.toString(),
                username = model.username,
                expirationTimeSeconds = model.expirationTimeSeconds,
                permissions = model.permissions
            )

        }
        fun createIngredientResponse(model: Ingredient): IngredientResponse {
            return IngredientResponse(
                guid = model.guid.toString(),
                username = model.username,
                name = model.ingredientName,
                imagePath = model.imagePath,
                type = model.type?.name,
                liked = model.liked
            )
        }

        fun createDrinkResponse(model: Drink): DrinkResponse {
            return DrinkResponse(
                guid = model.guid.toString(),
                username = model.username,
                name = model.drinkName,
                imagePath = model.imagePath,
                ingredients = model.ingredients.map {
                    DrinkIngredientResponse(
                        ingredientGuid = it.ingredientGuid.toString(),
                        amount = it.amount,
                        unit = it.unit
                    )
                },
                liked = model.liked,
                instructions = model.instructions,
                tags = model.tags,
                glass = model.glass,
                ibaCategory = model.ibaCategory
            )
        }

        fun createFullDrinkResponse(model: FullDrink): FullDrinkResponse {
            return FullDrinkResponse(
                guid = model.guid.toString(),
                username = model.username,
                name = model.drinkName,
                imagePath = model.imagePath,
                ingredients = model.ingredients.map {
                    FullDrinkIngredientResponse(
                        ingredientGuid = it.ingredientGuid.toString(),
                        amount = it.amount,
                        unit = it.unit,
                        ingredientName = it.ingredientName,
                        liked = it.liked,
                        type = it.type,
                        imagePath = it.imagePath
                    )
                },
                liked = model.liked,
                instructions = model.instructions,
                tags = model.tags,
                glass = model.glass,
                ibaCategory = model.ibaCategory
            )
        }
    }
}
