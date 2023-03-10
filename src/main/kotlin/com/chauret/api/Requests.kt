package com.chauret.api

import com.chauret.BadRequestException
import io.kotless.dsl.lang.KotlessContext
import io.kotless.dsl.model.HttpResponse
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

inline fun <reified T> getBody() = KotlessContext.HTTP.request.body?.let {
    Json.decodeFromString<T>(it.string)
} ?: throw IllegalArgumentException("Body of type ${T::class.simpleName} is required")

inline fun <reified T> runWithBodyAndResponse(
    expectedResponseType: SuccessfulResponseType = SuccessfulResponseType.OK,
    crossinline block: (body: T) -> Any
) = runWithResponse(expectedResponseType) {
    val body = runCatching { getBody<T>() }.getOrElse {
        throw BadRequestException("body of type ${T::class.simpleName} is required")
    }
    return@runWithResponse block(body)
}
