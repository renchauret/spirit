package com.chauret.db

interface Database<T> {
    fun get(key: String): T?
    fun get(queryArguments: Map<String, Any>): T?
    fun save(item: T)
    fun delete(id: String)
    fun createTable()
    fun enableTimeToLive(attributeName: String)
}
