package com.chauret.service

import com.chauret.BadRequestException
import com.chauret.NotFoundException
import com.chauret.api.request.*
import com.chauret.db.Database
import com.chauret.db.DynamoDatabase
import com.chauret.db.ImageDatabase
import com.chauret.db.S3ImageDatabase
import com.chauret.model.Permissions
import com.chauret.model.recipe.Drink
import com.chauret.model.recipe.DrinkIngredient
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.URL
import java.net.URLConnection
import java.util.*


@DynamoDBTable("drink", PermissionLevel.ReadWrite)
object DrinkService {
    private val database: Database<Drink> = DynamoDatabase.invoke()
    private val imageDatabase: ImageDatabase = S3ImageDatabase(Drink::class.simpleName!!.lowercase())

    fun getDrink(guid: UUID, username: String = Permissions.ADMIN.name) =
        database.get(username, guid.toString()) ?: throw NotFoundException("Drink not found")

    fun getDrinksForUser(username: String = Permissions.ADMIN.name): List<Drink> =
        database.getAllForKey(username)

    fun getDrinksByIngredient(ingredientGuid: UUID, username: String = Permissions.ADMIN.name): List<Drink> =
        getDrinksForUser(username).filter { drink ->
            drink.ingredients.any { it.ingredientGuid == ingredientGuid }
        }

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
                database.create(drink)
            } else {
                throw throwable
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
            ingredients = drinkRequest.ingredients.map { it.toDrinkIngredient(username) },
            instructions = drinkRequest.instructions,
            tags = drinkRequest.tags,
            liked = drinkRequest.liked,
            glass = drinkRequest.glass,
            ibaCategory = drinkRequest.ibaCategory
        )
        if (drinkRequest.image != null) {
            updatedDrink.imagePath = ImageService.processImage(drinkRequest.image, username, drink.guid, imageDatabase)
        }
        database.update(drink)
        return updatedDrink
    }

    fun deleteDrink(guid: UUID, username: String = Permissions.ADMIN.name) =
        database.delete(username, guid.toString())

    fun createTable() {
        database.createTable()
    }

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

    private fun DrinkRequest.toDrink(username: String): Drink {
        val drink = Drink(
            username = username,
            name = name,
            ingredients = ingredients.map { it.toDrinkIngredient(username) },
            instructions = instructions,
            tags = tags,
            liked = liked,
            glass = glass,
            ibaCategory = ibaCategory
        )
        if (image != null) {
            drink.imagePath = ImageService.processImage(image, username, drink.guid, imageDatabase)
        }
        return drink
    }
}
