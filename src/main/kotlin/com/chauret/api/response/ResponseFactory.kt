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
                description = model.description,
                imageUrl = model.imageUrl,
                type = model.type,
                liked = model.liked,
                alcoholic = model.alcoholic,
                abv = model.abv
            )
        }

        fun createDrinkResponse(model: Drink): DrinkResponse {
            return DrinkResponse(
                guid = model.guid.toString(),
                username = model.username,
                name = model.drinkName,
                imageUrl = model.imageUrl,
                ingredients = model.ingredients.map {
                    DrinkIngredientResponse(
                        ingredientGuid = it.ingredientGuid.toString(),
                        amount = it.amount,
                        unit = it.unit
                    )
                },
                liked = model.liked,
                instructions = model.instructions,
                description = model.description,
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
                imageUrl = model.imageUrl,
                ingredients = model.ingredients.map {
                    FullDrinkIngredientResponse(
                        ingredientGuid = it.ingredientGuid.toString(),
                        amount = it.amount,
                        unit = it.unit,
                        ingredientName = it.ingredientName,
                        description = it.description,
                        liked = it.liked,
                        type = it.type,
                        imageUrl = it.imageUrl,
                        alcoholic = it.alcoholic,
                        abv = it.abv
                    )
                },
                liked = model.liked,
                instructions = model.instructions,
                description = model.description,
                tags = model.tags,
                glass = model.glass,
                ibaCategory = model.ibaCategory
            )
        }
    }
}
