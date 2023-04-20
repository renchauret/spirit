package com.chauret.api.response

import com.chauret.model.Permissions

class SessionResponse(
    val token: String,
    val username: String?,
    val expirationTimeSeconds: Long,
    val permissions: Permissions
)
