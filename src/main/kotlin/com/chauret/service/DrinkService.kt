package com.chauret.service

import com.chauret.BadRequestException
import com.chauret.NotFoundException
import com.chauret.db.Database
import com.chauret.db.DynamoDatabase
import com.chauret.model.Permissions
import com.chauret.model.recipe.Drink
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable
import java.util.UUID

@DynamoDBTable("drink", PermissionLevel.ReadWrite)
object DrinkService {
    private val database: Database<Drink> = DynamoDatabase.invoke()

    fun getDrink(guid: UUID, username: String = Permissions.ADMIN.name) =
        database.get(username, guid.toString()) ?: throw NotFoundException("Drink not found")

    private fun createDrink(drink: Drink) = runCatching {
        getDrink(drink.guid, drink.username).let {
            throw BadRequestException("Drink already exists; edit it instead")
        }
    }.onFailure {
        if (it is NotFoundException) {
            database.save(drink)
        } else {
            throw it
        }
    }

    fun createTable() {
        database.createTable()
    }
}
