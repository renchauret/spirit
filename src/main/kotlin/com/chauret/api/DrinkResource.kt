package com.chauret.api

import com.chauret.api.request.DrinkRequest
import com.chauret.api.request.runWithBodyAndResponse
import com.chauret.api.request.runWithBodyAndUsernameAndResponse
import com.chauret.api.request.runWithUsernameAndResponse
import com.chauret.api.response.SuccessfulResponseType
import com.chauret.api.response.runWithResponse
import com.chauret.model.Permissions
import com.chauret.service.DrinkService
import io.kotless.dsl.lang.http.Delete
import io.kotless.dsl.lang.http.Get
import io.kotless.dsl.lang.http.Post
import io.kotless.dsl.lang.http.Put
import java.util.UUID

private const val ROUTE_PREFIX = "/drink"
private const val ADMIN_ROUTE_PREFIX = "/admin$ROUTE_PREFIX"

@Post(ADMIN_ROUTE_PREFIX)
fun createAdminDrink() = runWithBodyAndResponse<DrinkRequest>(SuccessfulResponseType.CREATED) { body ->
    DrinkService.createDrink(body, Permissions.ADMIN.name)
}

@Post(ROUTE_PREFIX)
fun createDrink() = runWithBodyAndUsernameAndResponse<DrinkRequest>(SuccessfulResponseType.CREATED) { body, username ->
    DrinkService.createDrink(body, username)
}

@Put(ADMIN_ROUTE_PREFIX)
fun editAdminDrink(guid: String) = runWithBodyAndResponse<DrinkRequest>(SuccessfulResponseType.OK) { body ->
    DrinkService.editDrink(body, Permissions.ADMIN.name, UUID.fromString(guid))
}

@Put(ROUTE_PREFIX)
fun editDrink(guid: String) =
    runWithBodyAndUsernameAndResponse<DrinkRequest>(SuccessfulResponseType.OK) { body, username ->
        DrinkService.editDrink(body, username, UUID.fromString(guid))
    }

@Delete(ADMIN_ROUTE_PREFIX)
fun deleteAdminDrink(guid: String) = runWithResponse(SuccessfulResponseType.OK) {
    DrinkService.deleteDrink(UUID.fromString(guid), Permissions.ADMIN.name)
}

@Delete(ROUTE_PREFIX)
fun deleteDrink(guid: String) = runWithUsernameAndResponse(SuccessfulResponseType.OK) { username ->
    DrinkService.deleteDrink(UUID.fromString(guid), username)
}


@Get(ADMIN_ROUTE_PREFIX)
fun getAdminDrink(guid: String) = runWithResponse(SuccessfulResponseType.OK) {
    DrinkService.getDrink(UUID.fromString(guid), Permissions.ADMIN.name)
}

@Get(ROUTE_PREFIX)
fun getDrink(guid: String) = runWithUsernameAndResponse(SuccessfulResponseType.OK) { username ->
    DrinkService.getDrink(UUID.fromString(guid), username)
}

@Get("$ADMIN_ROUTE_PREFIX/all")
fun getAdminDrinks() = runWithResponse(SuccessfulResponseType.OK) {
    DrinkService.getDrinksForUser(Permissions.ADMIN.name)
}

@Get("$ROUTE_PREFIX/all")
fun getDrinks() = runWithUsernameAndResponse(SuccessfulResponseType.OK) { username ->
    DrinkService.getDrinksForUser(username)
}
