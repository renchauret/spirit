package com.chauret.app

import com.chauret.model.Permissions
import dev.fritz2.core.*
import dev.fritz2.headless.components.modal
import dev.fritz2.remote.Authentication
import dev.fritz2.remote.Request
import dev.fritz2.remote.http
import kotlinx.coroutines.Job
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.w3c.xhr.FormData

// This class holds the information of the principal currently authenticated
@Lenses
@Serializable
data class Principal(val username: String, val permissions: Permissions, val token: String) {
    companion object
}

// This class holds the information entered in your login form
@Lenses
@Serializable
data class Credentials(val username: String = "", val password: String = "") {
    companion object
}

fun <D> Store<D>.set(value: D) {
    update.process(flowOnceOf(value), Job())
}

object MyAuthentication : Authentication<Principal>() {
    private val loginStore = storeOf(Credentials())
    private val loginModalOpen: Store<Boolean> = storeOf(false)

    private val login = loginStore.handle {
        val form = FormData()
        form.set("username", it.username)
        form.set("password", it.password)
        try {
            val principal =
                Json.decodeFromString(Principal.serializer(), http("/login").formData(form).post().body())
            complete(principal)
            loginModalOpen.set(false) // close the modal
            Credentials() // clear the input form
        } catch (e: Exception) {
            // show some error message
            it
        }
    }

    override fun authenticate() {
        render {
            modal {
                openState(loginModalOpen)
                modalPanel {
                    modalOverlay {
                        // add styling and maybe some pleasant transition
                    }
                    input {
                        loginStore.map(
                            lensOf(
                                "usernameLens",
                                { it.username },
                                { credentials, value -> credentials.copy(username = value) })
                        ).let {
                            value(it.data)
                            changes.values() handledBy it.update
                        }
                        placeholder("login")
                    }

                    input {
                        loginStore.map(
                            lensOf(
                                "passwordLens",
                                { it.password },
                                { credentials, value -> credentials.copy(password = value) })
                        ).let {
                            value(it.data)
                            changes.values() handledBy it.update
                        }
                        placeholder("password")
                    }

                    button {
                        +"login"
                        clicks handledBy login
                    }
                }
            }
        }
    }

    override fun addAuthentication(request: Request, principal: Principal?): Request =
        if (principal != null) {
            request.header("Authorization", "Bearer ${principal.token}")
        } else request
}
