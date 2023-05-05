package com.chauret.api.request

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonContentPolymorphicSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject

@Serializable(with = IngredientIdentifierDeserializer::class)
sealed class IngredientIdentifier {
    @Serializable
    data class Guid(val guid: String) : IngredientIdentifier()
    @Serializable
    data class Name(val name: String) : IngredientIdentifier()
}

@Serializable
data class DrinkIngredientRequest(
    val ingredientIdentifier: IngredientIdentifier,
    val amount: Float? = null,
    val unit: String? = null
)

@Serializable
data class DrinkRequest(
    val name: String,
    val ingredients: List<DrinkIngredientRequest> = emptyList(),
    val instructions: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val liked: Boolean = false,
    val description: String? = null,
    val image: ImageRequest? = null,
    val glass: String? = null,
    val ibaCategory: String? = null
)

@Serializable
data class BulkDrinkRequest(
    val drinks: List<DrinkRequest>
)

object IngredientIdentifierDeserializer : JsonContentPolymorphicSerializer<IngredientIdentifier>(IngredientIdentifier::class) {
    override fun selectDeserializer(element: JsonElement) = when {
        "name" in element.jsonObject -> IngredientIdentifier.Name.serializer()
        else -> IngredientIdentifier.Guid.serializer()
    }
}
