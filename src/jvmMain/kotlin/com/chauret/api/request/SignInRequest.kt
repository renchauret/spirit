package com.chauret.api.request

import kotlinx.serialization.Serializable

@Serializable
data class SignInRequest(
    var username: String,
    var password: String
)
