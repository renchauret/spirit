package com.chauret

import com.chauret.api.response.ErrorResponseType

sealed class ExceptionResponse(val type: ErrorResponseType, message: String) : Exception(message)
class NotFoundException(message: String) : ExceptionResponse(ErrorResponseType.NOT_FOUND, message)
class UnauthorizedException(message: String) : ExceptionResponse(ErrorResponseType.UNAUTHORIZED, message)
class ForbiddenException(message: String) : ExceptionResponse(ErrorResponseType.FORBIDDEN, message)
class BadRequestException(message: String) : ExceptionResponse(ErrorResponseType.BAD_REQUEST, message)
class ServerException(message: String = "Unexpected error") : ExceptionResponse(ErrorResponseType.SERVER_ERROR, message)
