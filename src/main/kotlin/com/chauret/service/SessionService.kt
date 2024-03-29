package com.chauret.service

import com.chauret.db.Database
import com.chauret.db.DynamoDatabase
import com.chauret.model.Permissions
import com.chauret.model.Session
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable
import java.util.UUID

@DynamoDBTable("session", PermissionLevel.ReadWrite)
object SessionService {
    private val database: Database<Session> = DynamoDatabase.invoke()

    fun getSessionByGuid(sessionId: UUID): Session? {
        return database.get(mapOf(Session::guid.name to sessionId))
    }

    private fun save(session: Session) {
        database.create(session)
    }

    fun createTable() {
        database.createTable()
        database.enableTimeToLive(Session::expirationTimeSeconds.name)
    }

    fun createSession(username: String, permissions: Permissions): Session {
        val session = Session(username = username, permissions = permissions)
        save(session)
        return session
    }
}
