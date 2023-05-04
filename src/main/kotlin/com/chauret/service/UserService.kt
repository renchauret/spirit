package com.chauret.service

import com.chauret.ForbiddenException
import com.chauret.NotFoundException
import com.chauret.ServerException
import com.chauret.UnauthorizedException
import com.chauret.api.request.SignInRequest
import com.chauret.db.Database
import com.chauret.db.DynamoDatabase
import com.chauret.model.Permissions
import com.chauret.model.Session
import com.chauret.model.User
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable
import java.security.MessageDigest
import java.util.Base64

@DynamoDBTable("user", PermissionLevel.ReadWrite)
object UserService {
    private val database: Database<User> = DynamoDatabase.invoke()

    fun getByUsername(username: String) =
        database.get(username) ?: throw NotFoundException("User $username not found")

    private fun getByUsernameAndPassword(username: String, encodedPassword: String): User {
        val user = database.get(username)
        return if (user != null) {
            if (user.encodedPassword == encodedPassword) {
                user
            } else {
                throw UnauthorizedException("Wrong password")
            }
        } else throw NotFoundException("User not found")
    }

    private fun createUser(signInRequest: SignInRequest) {
        if (Permissions.values().find { it.name.lowercase() == signInRequest.username.lowercase() } != null) {
            throw ForbiddenException("Username is reserved")
        }
        database.create(User(
            username = signInRequest.username,
            encodedPassword = encodePassword(signInRequest.password),
            permissions = if (signInRequest.username == "ren") Permissions.GOD else Permissions.USER
        ))
        // Users will pick their drinks from the admin drinks list instead of just copying all
//        runCatching {
//            IngredientService.initializeUserIngredients(signInRequest.username)
//            DrinkService.initializeUserDrinks(signInRequest.username)
//        }.onFailure { drinkInitError ->
//            val initDrinksFailedMessage = "Failed to initialize drinks for user ${signInRequest.username}"
//            println("$initDrinksFailedMessage; deleting user. Error: ${drinkInitError.stackTraceToString()}")
//            runCatching {
//                database.delete(signInRequest.username)
//            }.onFailure {
//                val message = "Failed to delete user ${signInRequest.username} after drink initialization failure"
//                println("$message. Error: ${it.message}")
//                throw ServerException(message)
//            }
//            throw ServerException(initDrinksFailedMessage)
//        }
    }

    fun authenticateUser(signInRequest: SignInRequest): Session {
        // Query the database for a user with the given username and password
        val user = getByUsernameAndPassword(signInRequest.username, encodePassword(signInRequest.password))

        // If a user is found, create and return a session
        user.username?.let { return SessionService.createSession(it, user.permissions) } ?: throw Exception("username is null")
    }

    fun grantAdmin(username: String) {
        val user = getByUsername(username)
        user.permissions = Permissions.ADMIN
        database.create(user)
        println("Admin permissions granted to $username")
    }

    fun createTable() {
        database.createTable()
    }

    fun signUp(signInRequest: SignInRequest) =
        runCatching {
            try {
                authenticateUser(signInRequest)
            } catch (e: UnauthorizedException) {
                throw UnauthorizedException("User already exists with a different password")
            } catch (e: NotFoundException) {
                // If user doesn't exist, create a new user
                createUser(signInRequest)
                // Then authenticate the user
                authenticateUser(signInRequest)
            }
        }.getOrElse {
            println(it.message)
            throw ServerException()
        }

    private fun encodePassword(password: String) = Base64.getUrlEncoder().encodeToString(
        MessageDigest.getInstance("SHA-256").digest(
            password.toByteArray(Charsets.UTF_8)
        )
    )
}
