package com.chauret.api.request

import com.chauret.BadRequestException
import com.chauret.UnauthorizedException
import com.chauret.api.response.SuccessfulResponseType
import com.chauret.api.response.runWithResponse
import com.chauret.service.SessionService
import io.kotless.dsl.lang.KotlessContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.util.UUID

const val AUTH_HEADER = "Authorization"

inline fun <reified T> getBody() = KotlessContext.HTTP.request.body?.let {
    Json.decodeFromString<T>(it.string)
} ?: throw BadRequestException("Body of type ${T::class.simpleName} is required")

fun getUsername() = SessionService.getSessionByGuid(
    UUID.fromString(
        KotlessContext.HTTP.request.headers[AUTH_HEADER]))?.username
    ?: throw UnauthorizedException("Auth is required for this resource")

inline fun <reified T> runWithBodyAndResponse(
    expectedResponseType: SuccessfulResponseType = SuccessfulResponseType.OK,
    crossinline block: (body: T) -> Any
) = runWithResponse(expectedResponseType) {
    block(getBody<T>())
}

inline fun <reified T> runWithBodyAndUsernameAndResponse(
    expectedResponseType: SuccessfulResponseType = SuccessfulResponseType.OK,
    crossinline block: (body: T, username: String) -> Any
) = runWithResponse(expectedResponseType) {
    block(getBody<T>(), getUsername())
}

fun runWithUsernameAndResponse(
    expectedResponseType: SuccessfulResponseType = SuccessfulResponseType.OK,
    block: (username: String) -> Any
) = runWithResponse(expectedResponseType) {
    block(getUsername())
}
