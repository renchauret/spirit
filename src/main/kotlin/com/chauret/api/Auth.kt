package com.chauret.api

import com.chauret.NotFoundException
import com.chauret.ServerException
import com.chauret.UnauthorizedException
import com.chauret.api.request.SignInRequest
import com.chauret.db.SessionDb
import com.chauret.db.UserDb
import com.chauret.model.Permissions
import com.chauret.model.Session
import io.kotless.MimeType
import io.kotless.dsl.app.http.RouteKey
import io.kotless.dsl.lang.http.HttpRequestInterceptor
import io.kotless.dsl.lang.http.Post
import io.kotless.dsl.model.HttpRequest
import io.kotless.dsl.model.HttpResponse
import java.security.MessageDigest
import java.util.Base64
import java.util.UUID

object AuthInterceptor: HttpRequestInterceptor {
    override val priority = 0

    override fun intercept(request: HttpRequest, key: RouteKey, next: (HttpRequest, RouteKey) -> HttpResponse): HttpResponse {
        val power = runCatching {
            SessionDb.getSessionByGuid(UUID.fromString(request.headers["auth"]))?.username?.let {
                UserDb.getByUsername(it).permissions.power } ?: Permissions.USER.power
        }.getOrElse { 0 }
        Permissions.values().forEach { permission ->
            if (key.path.toAbsoluteString().contains(permission.name.lowercase()) && power < permission.power) {
                val message = if (power == 0) {
                    "/signIn then include session.guid as a header named 'auth'"
                } else {
                    "You don't have permission to access this resource"
                }
                println("Unauthorized access attempt: ${request.headers["auth"]} to ${key.path.toAbsoluteString()} with power $power")
                return response(UnauthorizedException(message))
            }
        }
        return next(request, key)
    }
}

@Post("/signIn", MimeType.JSON)
fun signIn(): HttpResponse {
    return runWithBodyAndResponse<SignInRequest> {
        // Validate the username and password against the database or authentication service
        authenticateUser(it.username, encodePassword(it.password))
    }
}

@Post("/signUp", MimeType.JSON)
fun signUp(): HttpResponse {
    return runWithBodyAndResponse<SignInRequest> {
        val encodedPassword = encodePassword(it.password)
        // Check if user exists first
        runCatching {
            try {
                authenticateUser(it.username, encodedPassword)
            } catch (e: UnauthorizedException) {
                throw UnauthorizedException("User already exists with a different password")
            } catch (e: NotFoundException) {
                // If user doesn't exist, create a new user
                UserDb.createUser(it.username, encodedPassword)
                // Then authenticate the user
                authenticateUser(it.username, encodedPassword)
            }
        }.getOrElse {
            println(it.message)
            throw ServerException()
        }
    }
}

private fun authenticateUser(username: String, encodedPassword: String): Session {
    // Query the database for a user with the given username and password
    val user = UserDb.getByUsernameAndPassword(username, encodedPassword)

    // If a user is found, create and return a session
    user.username?.let { return SessionDb.createSession(it) } ?: throw Exception("username is null")
}

private fun encodePassword(password: String): String {
    return Base64.getUrlEncoder().encodeToString(
        MessageDigest.getInstance("SHA-256").digest(
            password.toByteArray(Charsets.UTF_8)
        ))
}
