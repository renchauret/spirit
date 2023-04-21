package com.chauret.service

import com.chauret.api.request.SignInRequest
import com.chauret.api.response.SessionResponse
import react.dom.html.FormMethod

object AuthService : Service {
    override val path: String
        get() = "/auth"

    suspend fun signIn(signInRequest: SignInRequest): SessionResponse =
        request(signInRequest, "put")

    suspend fun signUp(signInRequest: SignInRequest): SessionResponse =
        request(signInRequest, FormMethod.post)
}
