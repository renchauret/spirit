package com.chauret.model

enum class Permissions(val power: Int) {
    USER(1),
    ADMIN(100),
    GOD(Int.MAX_VALUE)
}
