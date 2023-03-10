package com.chauret.api

import com.chauret.NotFoundException
import com.chauret.UnauthorizedException
import com.chauret.api.request.SignInRequest
import com.chauret.db.*
import com.chauret.model.Permissions
import com.chauret.model.Session
import io.kotless.MimeType
import io.kotless.dsl.app.http.RouteKey
import io.kotless.dsl.lang.http.Get
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
                return response(ResponseType.UNAUTHORIZED, message)
            }
        }
        return next(request, key)
    }
}

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
            UserDb.createUser(request.username, encodedPassword)
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

@Get("/god/hello", MimeType.JSON)
fun godHello(): HttpResponse {
    return response(ResponseType.OK, "Hello God")
}

@Get("/user/hello", MimeType.JSON)
fun userHello(): HttpResponse {
    return response(ResponseType.OK, "Hello User")
}

@Get("/admin/hello", MimeType.JSON)
fun adminHello(): HttpResponse {
    return response(ResponseType.OK, "Hello Admin")
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
