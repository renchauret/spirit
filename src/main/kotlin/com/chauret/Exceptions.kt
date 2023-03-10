package com.chauret

import com.chauret.api.ErrorResponseType

sealed class SpiritException(val type: ErrorResponseType, message: String) : Exception(message)
class NotFoundException(message: String) : SpiritException(ErrorResponseType.NOT_FOUND, message)
class UnauthorizedException(message: String) : SpiritException(ErrorResponseType.UNAUTHORIZED, message)
class ForbiddenException(message: String) : SpiritException(ErrorResponseType.FORBIDDEN, message)
class BadRequestException(message: String) : SpiritException(ErrorResponseType.BAD_REQUEST, message)
class ServerException(message: String = "Unexpected error") : SpiritException(ErrorResponseType.SERVER_ERROR, message)
