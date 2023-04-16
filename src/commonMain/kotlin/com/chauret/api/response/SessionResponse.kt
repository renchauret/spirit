package com.chauret.api.response

class SessionResponse(
    val guid: String,
    val username: String?,
    val expirationTimeSeconds: Long
)
