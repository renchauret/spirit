package com.chauret.api

import com.chauret.UnauthorizedException
import com.chauret.api.request.SignInRequest
import com.chauret.api.response.response
import com.chauret.api.request.runWithBodyAndResponse
import com.chauret.service.SessionService
import com.chauret.service.UserService
import com.chauret.model.Permissions
import io.kotless.MimeType
import io.kotless.dsl.app.http.RouteKey
import io.kotless.dsl.lang.http.HttpRequestInterceptor
import io.kotless.dsl.lang.http.Post
import io.kotless.dsl.model.HttpRequest
import io.kotless.dsl.model.HttpResponse
import java.util.UUID

object AuthInterceptor: HttpRequestInterceptor {
    override val priority = 0

    override fun intercept(request: HttpRequest, key: RouteKey, next: (HttpRequest, RouteKey) -> HttpResponse): HttpResponse {
        val power = runCatching {
            SessionService.getSessionByGuid(UUID.fromString(request.headers["auth"]))?.username?.let {
                UserService.getByUsername(it).permissions.power } ?: Permissions.USER.power
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
fun signIn() = runWithBodyAndResponse<SignInRequest> {
    UserService.authenticateUser(it)
}

@Post("/signUp", MimeType.JSON)
fun signUp(): HttpResponse = runWithBodyAndResponse<SignInRequest> {
    UserService.signUp(it)
}
