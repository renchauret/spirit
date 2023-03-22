package com.chauret.db

interface ImageDatabase {
    fun get(key: String): ByteArray?
    fun create(key: String, imageBase64: String)
    fun delete(key: String)
}
