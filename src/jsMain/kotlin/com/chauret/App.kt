package com.chauret

import com.chauret.api.request.SignInRequest
import com.chauret.service.AuthService
import csstype.px
import emotion.css.css
import emotion.react.css
import kotlinx.coroutines.launch
import org.w3c.dom.HTMLFormElement
import react.FC
import react.Props
import react.dom.events.FormEvent
import react.dom.html.ButtonType
import react.dom.html.InputType
import react.dom.html.ReactHTML.button
import react.dom.html.ReactHTML.div
import react.dom.html.ReactHTML.form
import react.dom.html.ReactHTML.input
import react.useState

val App = FC<Props> {
    val (user, setUser) = useState(SignInRequest("", ""))
    suspend fun signIn() {
//        console.log(AuthService.signIn("ren", "extri16cate"))
        console.log(AuthService.signIn(user))
    }

    fun handleSubmission(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        mainScope.launch { signIn() }
    }

    div {
        css {
            margin = 10.px
        }
        form {
            onSubmit = { handleSubmission(it) }
            input {
                type = InputType.text
                name = "username"
                value = user.username
                placeholder = "username"
                onChange = { event ->
                    setUser {
                        it.copy(username = event.target.value)
                    }
                }
            }
            input {
                type = InputType.password
                name = "password"
                value = user.password
                placeholder = "password"
                onChange = { event ->
                    setUser {
                        user.copy(password = event.target.value)
                    }
                }
            }
            button {
                css {
                    margin = 10.px
                }
                +"Sign In"
                type = ButtonType.submit
            }
        }
    }
}
