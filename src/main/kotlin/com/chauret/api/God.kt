package com.chauret.api

import com.chauret.ServerException
import com.chauret.db.SessionDb
import com.chauret.db.UserDb
import io.kotless.MimeType
import io.kotless.dsl.lang.http.Post
import io.kotless.dsl.lang.http.Put
import io.kotless.dsl.model.HttpResponse

@Post("god/createTables", MimeType.JSON)
fun createTables(): HttpResponse {
    return runWithResponse(ResponseType.CREATED) {
        runCatching {
            UserDb.createTable()
            SessionDb.createTable()
            "Tables created"
        }.onFailure { throw ServerException("Error creating tables") }
    }
}

@Put("god/grantAdmin", MimeType.JSON)
fun grantAdmin(username: String): HttpResponse {
    return runWithResponse {
        UserDb.grantAdmin(username)
        "Admin permissions granted to $username"
    }
}
