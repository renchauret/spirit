package com.chauret.api

import com.chauret.ServerException
import com.chauret.db.SessionDb
import com.chauret.db.UserDb
import io.kotless.MimeType
import io.kotless.dsl.lang.http.Post
import io.kotless.dsl.lang.http.Put

private const val ROUTE_PREFIX = "god"

@Post("$ROUTE_PREFIX/createTables", MimeType.JSON)
fun createTables() = runWithResponse(SuccessfulResponseType.CREATED) {
    runCatching {
        UserDb.createTable()
        SessionDb.createTable()
        "Tables created"
    }.onFailure { throw ServerException("Error creating tables") }
}

@Put("$ROUTE_PREFIX/grantAdmin", MimeType.JSON)
fun grantAdmin(username: String) = runWithResponse {
    UserDb.grantAdmin(username)
    "Admin permissions granted to $username"
}
