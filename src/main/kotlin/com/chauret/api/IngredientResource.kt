package com.chauret.api

import com.chauret.api.request.IngredientRequest
import com.chauret.api.request.runWithBodyAndResponse
import com.chauret.api.request.runWithBodyAndUsernameAndResponse
import com.chauret.api.request.runWithUsernameAndResponse
import com.chauret.api.response.SuccessfulResponseType
import com.chauret.api.response.runWithResponse
import com.chauret.model.Permissions
import com.chauret.service.IngredientService
import io.kotless.MimeType
import io.kotless.dsl.lang.http.*
import java.util.UUID

private const val ROUTE_PREFIX = "/ingredient"
private const val USER_ROUTE_PREFIX = "/user$ROUTE_PREFIX"
private const val ADMIN_ROUTE_PREFIX = "/admin$ROUTE_PREFIX"

@Post(ADMIN_ROUTE_PREFIX)
fun createAdminIngredient() = runWithBodyAndResponse<IngredientRequest> (SuccessfulResponseType.CREATED) { body ->
    IngredientService.createIngredient(body, Permissions.ADMIN.name)
}

@Post(USER_ROUTE_PREFIX)
fun createIngredient() = runWithBodyAndUsernameAndResponse<IngredientRequest>(SuccessfulResponseType.CREATED) { body, username ->
    IngredientService.createIngredient(body, username)
}

@Put(ADMIN_ROUTE_PREFIX)
fun editAdminIngredient(guid: String) = runWithBodyAndResponse<IngredientRequest>(SuccessfulResponseType.OK) { body ->
    IngredientService.editIngredient(body, Permissions.ADMIN.name, UUID.fromString(guid))
}

@Put(USER_ROUTE_PREFIX)
fun editIngredient(guid: String) = runWithBodyAndUsernameAndResponse<IngredientRequest>(SuccessfulResponseType.OK) { body, username ->
    IngredientService.editIngredient(body, username, UUID.fromString(guid))
}

@Delete(ADMIN_ROUTE_PREFIX)
fun deleteAdminIngredient(guid: String) = runWithResponse(SuccessfulResponseType.OK) {
    IngredientService.deleteIngredient(UUID.fromString(guid), Permissions.ADMIN.name)
}

@Delete(USER_ROUTE_PREFIX)
fun deleteIngredient(guid: String) = runWithUsernameAndResponse(SuccessfulResponseType.OK) { username ->
    IngredientService.deleteIngredient(UUID.fromString(guid), username)
}

@Get(ADMIN_ROUTE_PREFIX)
fun getAdminIngredient(guid: String) = runWithResponse(SuccessfulResponseType.OK) {
    IngredientService.getIngredient(UUID.fromString(guid), Permissions.ADMIN.name)
}

@Get(USER_ROUTE_PREFIX)
fun getIngredient(guid: String) = runWithUsernameAndResponse(SuccessfulResponseType.OK) { username ->
    IngredientService.getIngredient(UUID.fromString(guid), username)
}

@Get("$ADMIN_ROUTE_PREFIX/all")
fun getAdminIngredients() = runWithResponse(SuccessfulResponseType.OK) {
    IngredientService.getIngredientsForUser(Permissions.ADMIN.name)
}

@Get("$ROUTE_PREFIX/all")
fun getIngredients() = runWithUsernameAndResponse(SuccessfulResponseType.OK) { username ->
    IngredientService.getIngredientsForUser(username)
}

@Options(ROUTE_PREFIX, MimeType.JSON)
fun ingredientOptions() = runWithResponse { true }

@Options(ADMIN_ROUTE_PREFIX, MimeType.JSON)
fun adminIngredientOptions() = runWithResponse { true }

@Options("$ADMIN_ROUTE_PREFIX/all", MimeType.JSON)
fun allIngredientOptions() = runWithResponse { true }

@Options("$ROUTE_PREFIX/all", MimeType.JSON)
fun adminAllIngredientOptions() = runWithResponse { true }
