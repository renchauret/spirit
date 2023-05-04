package com.chauret.api.request

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonContentPolymorphicSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject

enum class ImageType {
    PNG,
    JPG,
    JPEG,
    GIF
}

@Serializable(with = ImageRequestDeserializer::class)
sealed class ImageRequest {
    @Serializable
    data class ImageBase64(val imageBase64: String, val type: ImageType) : ImageRequest()
    @Serializable
    data class Url(val url: String) : ImageRequest()
}

object ImageRequestDeserializer : JsonContentPolymorphicSerializer<ImageRequest>(ImageRequest::class) {
    override fun selectDeserializer(element: JsonElement) = when {
        "imageBase64" in element.jsonObject -> ImageRequest.ImageBase64.serializer()
        else -> ImageRequest.Url.serializer()
    }
}
