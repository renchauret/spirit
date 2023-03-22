package com.chauret.api.response

import com.chauret.ServerException
import com.chauret.ExceptionResponse
import com.chauret.model.Session
import com.chauret.model.recipe.Drink
import com.chauret.model.recipe.Ingredient
import com.fasterxml.jackson.databind.ObjectMapper
import io.kotless.dsl.model.HttpResponse
import kotlin.reflect.full.memberProperties
import kotlin.reflect.full.starProjectedType

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
    val finalBody = if (body is Collection<*>) {
        body
    } else {
        body::class.simpleName?.let { bodyName ->
            mapOf(bodyName.replaceFirstChar { it.lowercase() } to body)
        } ?: body
    }
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
    runCatching {
        mapToResponse(block())
    }.getOrElse {
        println(it.message)
        if (it is ExceptionResponse) {
            return response(it)
        }
        return response(ServerException("Unexpected error"))
    }
)

fun mapToResponse(model: Any): Any {
    if (model is Collection<*>) return mapToResponse(model)
    return when (model::class) {
        Drink::class -> DrinkResponse(model as Drink)
        Session::class -> SessionResponse(model as Session)
        Ingredient::class -> IngredientResponse(model as Ingredient)
        else -> model
    }
}

inline fun <reified T> mapToResponse(model: Collection<T>): List<Any> = model.filterNotNull().map { mapToResponse(it) }
