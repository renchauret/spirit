package com.chauret.api.request

import kotlinx.serialization.Serializable

enum class ImageType {
    PNG,
    JPG,
    JPEG,
    GIF
}

@Serializable
sealed class ImageRequest {
    data class ImageBase64(val imageBase64: String, val type: ImageType) : ImageRequest()
    data class Url(val url: String) : ImageRequest()
}
