package com.chauret.api.response

import com.chauret.ServerException
import com.chauret.ExceptionResponse
import com.fasterxml.jackson.databind.ObjectMapper
import io.kotless.dsl.model.HttpResponse

interface ResponseType {
    val statusCode: Int
}

enum class SuccessfulResponseType(override val statusCode: Int): ResponseType {
    OK(200),
    CREATED(201)
}

enum class ErrorResponseType(override val statusCode: Int): ResponseType {
    BAD_REQUEST(400),
    UNAUTHORIZED(401),
    FORBIDDEN(403),
    NOT_FOUND(404),
    SERVER_ERROR(500)
}

fun headers() = hashMapOf("Content-Type" to "application/json")

private fun response(responseType: ResponseType, body: Any): HttpResponse {
    if (body is String) return response(responseType, body.toString())
    val finalBody = body::class.simpleName?.let { bodyName ->
        mapOf(bodyName.lowercase() to body)
    } ?: body
    return HttpResponse(
        statusCode = responseType.statusCode,
        headers = headers(),
        body = ObjectMapper().writeValueAsString(finalBody)
    )
}

private fun response(responseType: ResponseType, message: String): HttpResponse {
    val messageObject = object { val message = message }
    return response(
        responseType,
        if (responseType.statusCode >= 400)
            object { val error = messageObject }
        else messageObject
    )
}

fun response(exception: ExceptionResponse) = response(exception.type, exception.message ?: "Unknown error")

fun runWithResponse(
    expectedResponseType: SuccessfulResponseType = SuccessfulResponseType.OK,
    block: () -> Any
) = response(
    expectedResponseType,
    runCatching(block).getOrElse {
        println(it.message)
        if (it is ExceptionResponse) {
            return response(it)
        }
        return response(ServerException("Unexpected error"))
    }
)
