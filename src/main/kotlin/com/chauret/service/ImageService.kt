package com.chauret.service

import com.chauret.api.request.ImageRequest
import com.chauret.api.request.ImageType
import com.chauret.db.ImageDatabase
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.URL
import java.net.URLConnection
import java.util.*

object ImageService {
    fun processImage(
        imageRequest: ImageRequest,
        username: String,
        guid: UUID,
        imageDatabase: ImageDatabase
    ): String {
        return when (imageRequest) {
            is ImageRequest.ImageBase64 -> uploadImage(imageRequest, username, guid, imageDatabase)
            is ImageRequest.Url -> uploadImage(
                getByteArrayFromImageUrl(imageRequest.url),
                username,
                guid,
                imageDatabase
            )
        }
    }

    private fun uploadImage(
        imageRequest: ImageRequest.ImageBase64,
        username: String,
        guid: UUID,
        imageDatabase: ImageDatabase
    ): String {
        val imagePath = "$username/$guid.${imageRequest.type.name.lowercase()}"
        return imageDatabase.create(imagePath, imageRequest.imageBase64)
    }

    private fun getByteArrayFromImageUrl(url: String): ImageRequest.ImageBase64 {
        val imageUrl = URL(url)
        val urlConnection: URLConnection = imageUrl.openConnection()
        val inputStream: InputStream = urlConnection.getInputStream()
        val byteArrayOutputStream = ByteArrayOutputStream()
        val buffer = ByteArray(1024)
        var read: Int
        while (inputStream.read(buffer, 0, buffer.size).also { read = it } != -1) {
            byteArrayOutputStream.write(buffer, 0, read)
        }
        byteArrayOutputStream.flush()
        val imageBase64 = Base64.getEncoder().encodeToString(byteArrayOutputStream.toByteArray())
        return ImageRequest.ImageBase64(
            imageBase64 = imageBase64,
            type = ImageType.valueOf(url.split(".").last().uppercase())
        )
    }
}
