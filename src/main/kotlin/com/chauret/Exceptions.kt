package com.chauret

import com.chauret.api.ResponseType

sealed class SpiritException(val type: ResponseType, message: String) : Exception(message)
class NotFoundException(message: String) : SpiritException(ResponseType.NOT_FOUND, message)
class UnauthorizedException(message: String) : SpiritException(ResponseType.UNAUTHORIZED, message)
class ForbiddenException(message: String) : SpiritException(ResponseType.FORBIDDEN, message)
class BadRequestException(message: String) : SpiritException(ResponseType.BAD_REQUEST, message)
class ServerException(message: String = "Unexpected error") : SpiritException(ResponseType.SERVER_ERROR, message)
