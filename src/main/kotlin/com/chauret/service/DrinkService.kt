package com.chauret.service

import com.chauret.BadRequestException
import com.chauret.NotFoundException
import com.chauret.api.request.BulkDrinkRequest
import com.chauret.api.request.DrinkIngredientRequest
import com.chauret.api.request.DrinkRequest
import com.chauret.db.Database
import com.chauret.db.DynamoDatabase
import com.chauret.model.Permissions
import com.chauret.model.recipe.Drink
import com.chauret.model.recipe.DrinkIngredient
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable
import java.util.UUID

@DynamoDBTable("drink", PermissionLevel.ReadWrite)
object DrinkService {
    private val database: Database<Drink> = DynamoDatabase.invoke()

    fun getDrink(guid: UUID, username: String = Permissions.ADMIN.name) =
        database.get(username, guid.toString()) ?: throw NotFoundException("Drink not found")

    fun getDrinksForUser(username: String = Permissions.ADMIN.name): List<Drink> =
        database.getAllForKey(username)

    fun initializeUserDrinks(username: String): List<Drink> {
        val drinks = getDrinksForUser(Permissions.ADMIN.name).map { it.copy(username = username) }
        database.create(drinks)
        return drinks
    }

    fun createDrink(drinkRequest: DrinkRequest, username: String): Drink {
        val drink = drinkRequest.toDrink(username)
        runCatching {
            getDrink(drink.guid, drink.username).let {
                throw BadRequestException("Drink already exists; edit it instead")
            }
        }.onFailure {
            if (it is NotFoundException) {
                // TODO:  If an ingredient doesn't exist, error
                database.create(drink)
            } else {
                throw it
            }
        }
        return drink
    }

    fun createDrinks(bulkDrinkRequest: BulkDrinkRequest, username: String = Permissions.ADMIN.name): List<Drink> {
        val drinks = bulkDrinkRequest.drinks.map { it.toDrink(username) }
        database.create(drinks)
        return drinks
    }

    fun editDrink(drinkRequest: DrinkRequest, username: String, guid: UUID): Drink {
        val drink = getDrink(guid, username)
        val updatedDrink = drink.copy(
            name = drinkRequest.name,
            ingredients = drinkRequest.ingredients.map { it.toDrinkIngredient() },
            instructions = drinkRequest.instructions,
            tags = drinkRequest.tags,
            imagePath = drinkRequest.imagePath,
            glass = drinkRequest.glass,
            ibaCategory = drinkRequest.ibaCategory
        )
        // TODO:  If an ingredient doesn't exist, error
        database.update(drink)
        return updatedDrink
    }

    fun createTable() {
        database.createTable()
    }

    private fun DrinkIngredientRequest.toDrinkIngredient() = DrinkIngredient(
        ingredientGuid = UUID.fromString(ingredientGuid),
        amount = amount,
        unit = unit
    )

    private fun DrinkRequest.toDrink(username: String) = Drink(
        username = username,
        name = name,
        ingredients = ingredients.map { it.toDrinkIngredient() },
        instructions = instructions,
        tags = tags,
        imagePath = imagePath,
        glass = glass,
        ibaCategory = ibaCategory
    )
}
