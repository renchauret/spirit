package com.chauret.service

import com.chauret.BadRequestException
import com.chauret.NotFoundException
import com.chauret.api.request.BulkIngredientRequest
import com.chauret.api.request.IngredientRequest
import com.chauret.db.Database
import com.chauret.db.DynamoDatabase
import com.chauret.db.ImageDatabase
import com.chauret.db.S3ImageDatabase
import com.chauret.model.Permissions
import com.chauret.model.recipe.Ingredient
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable
import java.util.*
import kotlin.streams.toList

@DynamoDBTable("ingredient", PermissionLevel.ReadWrite)
object IngredientService {
    private val database: Database<Ingredient> = DynamoDatabase.invoke()
    private val imageDatabase: ImageDatabase = S3ImageDatabase(Ingredient::class.simpleName!!.lowercase())

    fun getIngredient(guid: UUID, username: String = Permissions.ADMIN.name) =
        database.get(username, guid.toString()) ?: throw NotFoundException("Ingredient not found")

    fun getIngredientsForUser(username: String = Permissions.ADMIN.name): List<Ingredient> =
        database.getAllForKey(username)

    fun getIngredientsForUserAndGuids(username: String = Permissions.ADMIN.name, guids: List<UUID>): List<Ingredient> =
        database.getAllForKeyAndSecondaryKeys(username, guids.stream().map { it.toString() }.toList())

    fun initializeUserIngredients(username: String): List<Ingredient> {
        val ingredients = getIngredientsForUser(Permissions.ADMIN.name).map { it.copy(username = username) }
        database.create(ingredients)
        return ingredients
    }

    fun createIngredient(ingredientRequest: IngredientRequest, username: String): Ingredient {
        val ingredient = ingredientRequest.toIngredient(username)
        runCatching {
            getIngredient(ingredient.guid, ingredient.username).let {
                throw BadRequestException("Ingredient already exists; edit it instead")
            }
        }.onFailure {
            if (it is NotFoundException) {
                database.create(ingredient)
            } else {
                throw it
            }
        }
        return ingredient
    }

    fun createIngredients(
        bulkIngredientRequest: BulkIngredientRequest,
        username: String = Permissions.ADMIN.name
    ): List<Ingredient> {
        val ingredients = bulkIngredientRequest.ingredients.map { it.toIngredient(username) }
        database.create(ingredients)
        return ingredients
    }

    fun editIngredient(ingredientRequest: IngredientRequest, username: String, guid: UUID): Ingredient {
        val ingredient = getIngredient(guid, username)
        val updatedIngredient = ingredient.copy(
            ingredientName = ingredientRequest.name,
            liked = ingredientRequest.liked,
            type = ingredientRequest.type,
        )
        if (ingredientRequest.image != null) {
            ingredient.imageUrl =
                ImageService.processImage(ingredientRequest.image, username, ingredient.guid, imageDatabase)
        }
        database.update(ingredient)
        return updatedIngredient
    }

    fun deleteIngredient(guid: UUID, username: String = Permissions.ADMIN.name) {
        if (DrinkService.getDrinksByIngredient(guid, username).isNotEmpty()) {
            throw BadRequestException("Ingredient is used in a drink")
        }
        database.delete(username, guid.toString())
    }

    fun createTable() {
        database.createTable()
    }

    private fun IngredientRequest.toIngredient(username: String): Ingredient {
        val ingredient = Ingredient(
            username = username,
            ingredientName = name.lowercase(),
            description = description,
            liked = liked,
            type = type?.lowercase(),
            alcoholic = alcoholic,
            abv = abv
        )
        if (image != null) {
            ingredient.imageUrl = ImageService.processImage(image, username, ingredient.guid, imageDatabase)
        }
        return ingredient
    }

    fun getIngredientByName(name: String, username: String): Ingredient {
        return database.get(username, mapOf("ingredientName" to name.lowercase())) ?: throw NotFoundException("Ingredient not found")
    }
}
