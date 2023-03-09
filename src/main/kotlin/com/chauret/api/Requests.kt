package com.chauret.api

import io.kotless.dsl.lang.KotlessContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

inline fun <reified T> getBody(): T {
    return KotlessContext.HTTP.request.body?.let { Json.decodeFromString<T>(it.string) } ?:
        throw IllegalArgumentException("Body of type ${T::class.simpleName} is required")
}
