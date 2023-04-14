package com.chauret.api.response

import com.chauret.model.Session

class SessionResponse(model: Session) {
    val guid: String = model.guid.toString()
    val username: String? = model.username
    val expirationTimeSeconds: Long = model.expirationTimeSeconds
}
