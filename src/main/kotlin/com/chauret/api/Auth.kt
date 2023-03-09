package com.chauret.api

import com.chauret.NotFoundException
import com.chauret.UnauthorizedException
import com.chauret.api.request.SignInRequest
import com.chauret.db.*
import com.chauret.model.Session
import com.chauret.model.User
import io.kotless.MimeType
import io.kotless.dsl.lang.http.Post
import io.kotless.dsl.model.HttpResponse
import java.security.MessageDigest
import java.util.Base64

@Post("/signIn", MimeType.JSON)
fun signIn(): HttpResponse {
    val request = runCatching { getBody<SignInRequest>() }.getOrElse {
        return response(ResponseType.BAD_REQUEST, "username and password are required")
    }
    // Validate the username and password against the database or authentication service
    val session: Session = runCatching {
        authenticateUser(request.username, encodePassword(request.password))
    }.getOrElse {
        if (it is NotFoundException) {
            return response(
                ResponseType.UNAUTHORIZED,
                "Invalid username"
            )
        } else if (it is UnauthorizedException) {
            return response(
                ResponseType.UNAUTHORIZED,
                "Wrong password"
            )
        }
        println(it.message)
        return unexpectedErrorResponse()
    }

    return okResponse(session)
}

@Post("/signUp", MimeType.JSON)
fun signUp(): HttpResponse {
    val request = runCatching { getBody<SignInRequest>() }.getOrElse {
        return response(ResponseType.BAD_REQUEST, "username and password are required")
    }
    val encodedPassword = encodePassword(request.password)
    // Check if user exists first
    val session: Session = runCatching {
        try {
            authenticateUser(request.username, encodedPassword)
        } catch (e: UnauthorizedException) {
            return response(
                ResponseType.UNAUTHORIZED,
                "User already exists with a different password"
            )
        } catch (e: NotFoundException) {
            // If user doesn't exist, create a new user
            UserDb.save(User(username = request.username, encodedPassword = encodedPassword))
            // Then authenticate the user
            authenticateUser(request.username, encodedPassword)
        }
    }.getOrElse {
        println(it.message)
        return unexpectedErrorResponse()
    }

    return okResponse(session)
}

@Post("/createTables", MimeType.JSON)
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

private fun authenticateUser(username: String, encodedPassword: String): Session {
    // Query the database for a user with the given username and password
    val user = UserDb.getByUsernameAndPassword(username, encodedPassword)

    // If a user is found, create and return a session
    return if (user != null) SessionDb.createSession() else
        throw NotFoundException("Invalid username or password")
}

private fun encodePassword(password: String): String {
    return Base64.getUrlEncoder().encodeToString(
        MessageDigest.getInstance("SHA-256").digest(
            password.toByteArray(Charsets.UTF_8)
        ))
}
