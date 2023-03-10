package com.chauret.api

import com.fasterxml.jackson.databind.ObjectMapper
import io.kotless.dsl.model.HttpResponse

enum class ResponseType(val statusCode: Int) {
    OK(200),
    CREATED(201),
    BAD_REQUEST(400),
    UNAUTHORIZED(401),
    SERVER_ERROR(500)
}

fun headers() = hashMapOf("Content-Type" to "application/json")

fun response(responseType: ResponseType, body: Any): HttpResponse {
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

fun okResponse(body: Any): HttpResponse = response(ResponseType.OK, body)
fun okResponse(body: String): HttpResponse = response(ResponseType.OK, body)

fun unexpectedErrorResponse() = response(ResponseType.SERVER_ERROR, "Unexpected error")
