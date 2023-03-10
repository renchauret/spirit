package com.chauret.model.recipe

import java.util.UUID

interface Recipe {
    val guid: UUID
    // the user who owns this recipe
    val username: String
    val name: String
    // map of ingredient names to (quantity, unit)
    val ingredients: Map<String, Pair<Float, String>>
    val instructions: List<String>
    val tags: List<String>
    val imagePath: String?
}