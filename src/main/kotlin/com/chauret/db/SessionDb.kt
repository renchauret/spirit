package com.chauret.db

import com.chauret.model.Session
import io.kotless.PermissionLevel
import io.kotless.dsl.cloud.aws.DynamoDBTable
import java.util.UUID

@DynamoDBTable("session", PermissionLevel.ReadWrite)
object SessionDb {
    private val database: Database<Session> = DynamoDatabase.invoke()

    fun getSessionByGuid(sessionId: UUID): Session? {
        return database.get(mapOf(Session::guid.name to sessionId))
    }

    private fun save(session: Session) {
        database.save(session)
    }

    fun createTable() {
        database.createTable()
        database.enableTimeToLive(Session::expirationTimeSeconds.name)
    }

    fun createSession(): Session {
        val session = Session()
        save(session)
        return session
    }
}
