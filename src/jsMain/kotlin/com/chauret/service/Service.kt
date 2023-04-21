package com.chauret.service

import kotlinx.browser.window
import kotlinx.coroutines.await
import kotlinx.serialization.json.Json
import kotlinx.serialization.serializer
import org.w3c.fetch.RequestInit
import react.dom.html.FormMethod

interface Service {
    val baseUrl: String
        get() {
            if (window.location.port != "")
                return "${window.location.protocol}//${window.location.hostname}:${window.location.port.toInt() + 1}"
            return window.location.origin
        }
    val path: String
    val url: String
        get() = "$baseUrl$path"

}

suspend inline fun <reified Q, reified T> Service.request(
    body: Q,
    method: String = FormMethod.get,
    path: String = ""
): T =
    Json.decodeFromString(serializer(), window.fetch("$url$path", object :
        RequestInit {
        override var method: String? = method
        override var body: dynamic = Json.encodeToString(serializer(), body)
    }
    ).await().text().await())
