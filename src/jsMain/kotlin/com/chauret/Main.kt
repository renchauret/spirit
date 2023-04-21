package com.chauret

import kotlinx.browser.document
import kotlinx.coroutines.MainScope
import react.create
import react.dom.client.createRoot

val mainScope = MainScope()

fun main() {
    val container = document.getElementById("root") ?: error("Couldn't find root container!")
    createRoot(container).render(App.create())
}
