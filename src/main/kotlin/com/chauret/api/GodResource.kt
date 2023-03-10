package com.chauret.api

import com.chauret.ServerException
import com.chauret.api.response.SuccessfulResponseType
import com.chauret.api.response.runWithResponse
import com.chauret.service.DrinkService
import com.chauret.service.SessionService
import com.chauret.service.UserService
import io.kotless.MimeType
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
        "Tables created"
    }.getOrElse { throw ServerException("Error creating tables") }
}

@Put("$ROUTE_PREFIX/admin", MimeType.JSON)
fun grantAdmin(username: String) = runWithResponse {
    UserService.grantAdmin(username)
    "Admin permissions granted to $username"
}
