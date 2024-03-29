package com.chauret.api.response

import com.chauret.ExceptionResponse
import com.chauret.ServerException
import com.chauret.model.Session
import com.chauret.model.recipe.Drink
import com.chauret.model.recipe.FullDrink
import com.chauret.model.recipe.Ingredient
import com.fasterxml.jackson.databind.ObjectMapper
import io.kotless.dsl.model.HttpResponse

interface ResponseType {
    val statusCode: Int
}

enum class SuccessfulResponseType(override val statusCode: Int) : ResponseType {
    OK(200),
    CREATED(201)
}

enum class ErrorResponseType(override val statusCode: Int) : ResponseType {
    BAD_REQUEST(400),
    UNAUTHORIZED(401),
    FORBIDDEN(403),
    NOT_FOUND(404),
    SERVER_ERROR(500)
}

fun headers() = hashMapOf(
    "Content-Type" to "application/json",
    "Access-Control-Allow-Origin" to "*",
    "Access-Control-Allow-Methods" to "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers" to "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
)

private fun response(responseType: ResponseType, body: Any): HttpResponse {
    if (body is String) return response(responseType, body.toString())
    return HttpResponse(
        statusCode = responseType.statusCode,
        headers = headers(),
        body = ObjectMapper().writeValueAsString(body)
    )
}

private fun response(responseType: ResponseType, message: String): HttpResponse {
    val messageObject = object {
        val message = message
    }
    return response(
        responseType,
        if (responseType.statusCode >= 400)
            object {
                val error = messageObject
            }
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
        val response = mapToResponse(block())
        println(response)
        response
    }.getOrElse {
        println(it)
        if (it is ExceptionResponse) {
            return response(it)
        }
        return response(ServerException("Unexpected error"))
    }
)

fun mapToResponse(model: Any): Any {
    if (model is Collection<*>) return mapToResponse(model)
    return when (model::class) {
        Drink::class -> ResponseFactory.createDrinkResponse(model as Drink)
        FullDrink::class -> ResponseFactory.createFullDrinkResponse(model as FullDrink)
        Ingredient::class -> ResponseFactory.createIngredientResponse(model as Ingredient)
        Session::class -> ResponseFactory.createSessionResponse(model as Session)
        else -> model
    }
}

inline fun <reified T> mapToResponse(model: Collection<T>): List<Any> = model.filterNotNull().map { mapToResponse(it) }
