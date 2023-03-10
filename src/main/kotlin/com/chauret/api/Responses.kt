package com.chauret.api

import com.chauret.SpiritException
import com.fasterxml.jackson.databind.ObjectMapper
import io.kotless.dsl.model.HttpResponse

enum class ResponseType(val statusCode: Int) {
    OK(200),
    CREATED(201),
    BAD_REQUEST(400),
    UNAUTHORIZED(401),
    FORBIDDEN(403),
    NOT_FOUND(404),
    SERVER_ERROR(500)
}

fun headers() = hashMapOf("Content-Type" to "application/json")

fun response(responseType: ResponseType, body: Any): HttpResponse {
    if (body is String) return response(responseType, body.toString())
    val finalBody = body::class.simpleName?.let { bodyName ->
        mapOf(bodyName.lowercase() to body)
    } ?: body
    return HttpResponse(
        statusCode = responseType.statusCode,
        headers = headers (),
        body = ObjectMapper().writeValueAsString(finalBody)
    )
}

fun response(responseType: ResponseType, message: String): HttpResponse {
    val messageObject = object { val message = message }
    return response(
        responseType,
        if (responseType.statusCode >= 400)
            object { val error = messageObject }
        else messageObject
    )
}

fun response(exception: SpiritException) = response(exception.type, exception.message ?: "Unknown error")
fun unexpectedErrorResponse() = response(ResponseType.SERVER_ERROR, "Unexpected error")

fun runWithResponse(responseType: ResponseType = ResponseType.OK, block: () -> Any) = response(
    responseType,
    runCatching(block).getOrElse {
        println(it.message)
        if (it is SpiritException) {
            return response(it)
        }
        return unexpectedErrorResponse()
    }
)
