package com.chauret.api

import io.kotless.dsl.lang.http.Get

@Get("/hello")
fun sayHello() = response(ResponseType.UNAUTHORIZED, "Unauthorized")
