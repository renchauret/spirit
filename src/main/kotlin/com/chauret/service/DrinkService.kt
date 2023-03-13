package com.chauret.service

import com.chauret.BadRequestException
import com.chauret.NotFoundException
import com.chauret.api.request.BulkDrinkRequest
import com.chauret.api.request.DrinkIngredientRequest
import com.chauret.api.request.DrinkRequest
import com.chauret.api.request.IngredientGuidOrName
import com.chauret.api.request.IngredientRequest
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
        }.onFailure { throwable ->
            if (throwable is NotFoundException) {
//                drinkRequest.checkIngredientsExist(username)
                database.create(drink)
            } else {
                throw throwable
            }
        }
        return drink
    }

    fun createDrinks(bulkDrinkRequest: BulkDrinkRequest, username: String = Permissions.ADMIN.name): List<Drink> {
//        bulkDrinkRequest.checkIngredientsExist(username)
        val drinks = bulkDrinkRequest.drinks.map { it.toDrink(username) }
        database.create(drinks)
        return drinks
    }

    fun editDrink(drinkRequest: DrinkRequest, username: String, guid: UUID): Drink {
        val drink = getDrink(guid, username)
        val updatedDrink = drink.copy(
            name = drinkRequest.name,
            ingredients = drinkRequest.ingredients.map { it.toDrinkIngredient(username) },
            instructions = drinkRequest.instructions,
            tags = drinkRequest.tags,
            imagePath = drinkRequest.imagePath,
            glass = drinkRequest.glass,
            ibaCategory = drinkRequest.ibaCategory
        )
//        drinkRequest.checkIngredientsExist(username)
        database.update(drink)
        return updatedDrink
    }

    fun createTable() {
        database.createTable()
    }

//    private fun checkIngredientsExist(ingredientGuids: List<UUID>, username: String = Permissions.ADMIN.name) {
//        val existingIngredients = IngredientService.getIngredientsForUserAndGuids(
//            username, ingredientGuids.map { it }
//        )
//        if (existingIngredients.size != ingredientGuids.size) {
//            throw BadRequestException("One or more ingredients do not exist")
//        }
//    }

//    private fun BulkDrinkRequest.checkIngredientsExist(username: String = Permissions.ADMIN.name) {
//        checkIngredientsExist(drinks.flatMap { it.getIngredientGuids() }, username)
//    }
//
//    private fun DrinkRequest.checkIngredientsExist(username: String = Permissions.ADMIN.name) {
//        checkIngredientsExist(getIngredientGuids(), username)
//    }
//
//    private fun DrinkRequest.getIngredientGuids() = ingredients.map { UUID.fromString(it.ingredientGuid) }

    private fun DrinkIngredientRequest.toDrinkIngredient(username: String) = DrinkIngredient(
        ingredientGuid = UUID.fromString(
            // ensure ingredient exists
            if (ingredientGuidOrName is IngredientGuidOrName.Guid)
                IngredientService.getIngredient(UUID.fromString(ingredientGuidOrName.guid), username).guid.toString()
            // if just a name, check if it exists and create it if it doesn't
            else runCatching {
                IngredientService.getIngredientByName(
                    (ingredientGuidOrName as IngredientGuidOrName.Name).name, username
                ).guid.toString()
            }.getOrElse {
                if (it is NotFoundException) {
                    IngredientService.createIngredient(
                        IngredientRequest(name = (ingredientGuidOrName as IngredientGuidOrName.Name).name),
                        username
                    ).guid.toString()
                } else {
                    throw it
                }
            }
        ),
        amount = amount,
        unit = unit
    )

    private fun DrinkRequest.toDrink(username: String) = Drink(
        username = username,
        name = name,
        ingredients = ingredients.map { it.toDrinkIngredient(username) },
        instructions = instructions,
        tags = tags,
        imagePath = imagePath,
        glass = glass,
        ibaCategory = ibaCategory
    )
}
