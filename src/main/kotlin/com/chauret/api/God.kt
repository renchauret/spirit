package com.chauret.api

import com.chauret.NotFoundException
import com.chauret.db.SessionDb
import com.chauret.db.UserDb
import io.kotless.MimeType
import io.kotless.dsl.lang.http.Post
import io.kotless.dsl.lang.http.Put
import io.kotless.dsl.model.HttpResponse

@Post("god/createTables", MimeType.JSON)
fun createTables(): HttpResponse {
    runCatching {
        UserDb.createTable()
        SessionDb.createTable()
    }.onFailure {
        println(it)
        return response(ResponseType.SERVER_ERROR, "Error creating tables")
    }
    return response(ResponseType.CREATED, "Tables created")
}

@Put("god/grantAdmin", MimeType.JSON)
fun grantAdmin(username: String): HttpResponse {
    runCatching {
        UserDb.grantAdmin(username)
    }.onFailure {
        println(it.message)
        if (it is NotFoundException) {
            return response(ResponseType.BAD_REQUEST, "User not found")
        }
        return response(ResponseType.SERVER_ERROR, "Error granting admin")
    }
    return okResponse("Admin permissions granted to $username")
}