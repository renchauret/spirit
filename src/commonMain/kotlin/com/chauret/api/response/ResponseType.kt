package com.chauret.api.response

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
