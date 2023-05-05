package com.chauret.api

import com.chauret.ServerException
import com.chauret.api.request.BulkDrinkRequest
import com.chauret.api.request.BulkIngredientRequest
import com.chauret.api.request.runWithBodyAndResponse
import com.chauret.api.response.SuccessfulResponseType
import com.chauret.api.response.runWithResponse
import com.chauret.service.DrinkService
import com.chauret.service.IngredientService
import com.chauret.service.SessionService
import com.chauret.service.UserService
import io.kotless.MimeType
import io.kotless.dsl.lang.http.Options
import io.kotless.dsl.lang.http.Post
import io.kotless.dsl.lang.http.Put

private const val ROUTE_PREFIX = "/god"

@Post("$ROUTE_PREFIX/auth/tables", MimeType.JSON)
fun createAuthTables() = runWithResponse(SuccessfulResponseType.CREATED) {
    runCatching {
        UserService.createTable()
        SessionService.createTable()
        "Tables created"
    }.getOrElse { throw ServerException("Error creating tables") }
}

@Post("$ROUTE_PREFIX/drink/tables", MimeType.JSON)
fun createDrinkTables() = runWithResponse(SuccessfulResponseType.CREATED) {
    runCatching {
        DrinkService.createTable()
        IngredientService.createTable()
        "Tables created"
    }.getOrElse { throw ServerException("Error creating tables") }
}

@Put("$ROUTE_PREFIX/admin", MimeType.JSON)
fun grantAdmin(username: String) = runWithResponse {
    UserService.grantAdmin(username)
    "Admin permissions granted to $username"
}

@Post("$ROUTE_PREFIX/admin/drink/all", MimeType.JSON)
fun createAdminDrinks() = runWithBodyAndResponse<BulkDrinkRequest>(SuccessfulResponseType.CREATED) {
    runCatching {
        DrinkService.createDrinks(it)
    }.getOrElse { throw ServerException("Error creating admin drinks") }
}

@Post("$ROUTE_PREFIX/admin/ingredient/all", MimeType.JSON)
fun createAdminIngredients() = runWithBodyAndResponse<BulkIngredientRequest>(SuccessfulResponseType.CREATED) {
    runCatching {
        IngredientService.createIngredients(it)
//    }.getOrElse { throw ServerException("Error creating admin ingredients") }
    }.getOrElse { throw it }
}

@Options("$ROUTE_PREFIX/auth/tables", MimeType.JSON)
fun authTablesOptions() = runWithResponse { true }

@Options("$ROUTE_PREFIX/drink/tables", MimeType.JSON)
fun drinkTablesOptions() = runWithResponse { true }

@Options("$ROUTE_PREFIX/admin", MimeType.JSON)
fun giveAdminOptions() = runWithResponse { true }

@Options("$ROUTE_PREFIX/admin/drink/all", MimeType.JSON)
fun createAdminDrinksOptions() = runWithResponse { true }

@Options("$ROUTE_PREFIX/admin/ingredient/all", MimeType.JSON)
fun createAdminIngredientsOptions() = runWithResponse { true }
