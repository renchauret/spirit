package com.chauret.service

import com.chauret.BadRequestException
import com.chauret.NotFoundException
import com.chauret.api.request.BulkIngredientRequest
import com.chauret.api.request.IngredientRequest
import com.chauret.db.Database
import com.chauret.db.DynamoDatabase
import com.chauret.model.Permissions
import com.chauret.model.recipe.Ingredient
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable
import java.util.UUID
import kotlin.streams.toList

@DynamoDBTable("ingredient", PermissionLevel.ReadWrite)
object IngredientService {
    private val database: Database<Ingredient> = DynamoDatabase.invoke()

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
                // TODO:  If an ingredient doesn't exist, error
                database.create(ingredient)
            } else {
                throw it
            }
        }
        return ingredient
    }

    fun createIngredients(bulkIngredientRequest: BulkIngredientRequest, username: String = Permissions.ADMIN.name): List<Ingredient> {
        val ingredients = bulkIngredientRequest.ingredients.map { it.toIngredient(username) }
        database.create(ingredients)
        return ingredients
    }

    fun editIngredient(ingredientRequest: IngredientRequest, username: String, guid: UUID): Ingredient {
        val ingredient = getIngredient(guid, username)
        val updatedIngredient = ingredient.copy(
            name = ingredientRequest.name,
            type = ingredientRequest.type,
            imagePath = ingredientRequest.imagePath
        )
        // TODO:  If an ingredient doesn't exist, error
        database.update(ingredient)
        return updatedIngredient
    }

    fun createTable() {
        database.createTable()
    }

    private fun IngredientRequest.toIngredient(username: String) = Ingredient(
        username = username,
        name = name,
        type = type,
        imagePath = imagePath
    )

    fun getIngredientByName(name: String, username: String): Ingredient {
        return database.get(username, mapOf("name" to name)) ?: throw NotFoundException("Ingredient not found")
    }
}
