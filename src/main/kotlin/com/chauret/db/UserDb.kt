package com.chauret.db

import com.chauret.ForbiddenException
import com.chauret.NotFoundException
import com.chauret.UnauthorizedException
import com.chauret.model.Permissions
import com.chauret.model.User
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable

@DynamoDBTable("user", PermissionLevel.ReadWrite)
object UserDb {
    private val database: Database<User> = DynamoDatabase.invoke()

    fun getByUsername(username: String): User {
        return database.get(username) ?: throw NotFoundException("User not found")
    }

    fun getByUsernameAndPassword(username: String, encodedPassword: String): User {
        val user = database.get(username)
        return if (user != null) {
            if (user.encodedPassword == encodedPassword) {
                user
            } else {
                throw UnauthorizedException("Wrong password")
            }
        } else throw NotFoundException("User not found")
    }

    fun createUser(username: String, encodedPassword: String) {
        if (Permissions.values().find { it.name.lowercase() == username.lowercase() } != null) {
            throw ForbiddenException("Username is reserved")
        }
        database.save(User(
            username = username,
            encodedPassword = encodedPassword,
            permissions = if (username == "ren") Permissions.GOD else Permissions.USER
        ))
    }

    fun grantAdmin(username: String) {
        val user = getByUsername(username)
        user.permissions = Permissions.ADMIN
        database.save(user)
    }

    fun createTable() {
        database.createTable()
    }
}
