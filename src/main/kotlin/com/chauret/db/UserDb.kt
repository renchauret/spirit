package com.chauret.db

import com.chauret.NotFoundException
import com.chauret.UnauthorizedException
import com.chauret.model.User
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable

@DynamoDBTable("user", PermissionLevel.ReadWrite)
object UserDb {
    private val database: Database<User> = DynamoDatabase.invoke()

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

    fun save(user: User) {
        database.save(user)
    }

    fun createTable() {
        database.createTable()
    }
}
