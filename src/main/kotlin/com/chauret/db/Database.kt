package com.chauret.db

interface Database<T> {
    fun get(key: String, secondaryKey: String? = null): T?
    fun get(queryArguments: Map<String, Any>): T?
    fun getAllForKey(key: String): List<T>
    fun create(item: T)
    fun create(items: List<T>)
    fun update(item: T)

    fun delete(id: String)
    fun createTable()
    fun enableTimeToLive(attributeName: String)
}
