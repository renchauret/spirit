package com.chauret.api.request

import kotlinx.serialization.Serializable

enum class ImageType {
    PNG,
    JPG
}

@Serializable
data class ImageRequest (
    val imageBase64: String,
    val type: ImageType
)
