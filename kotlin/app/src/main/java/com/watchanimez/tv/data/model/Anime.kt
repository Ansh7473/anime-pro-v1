package com.watchanimez.tv.data.model

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.*

@Serializable
data class Anime(
    val id: Int,
    @SerialName("mal_id") val malId: Int? = null,
    @SerialName("anilist_id") val anilistId: Int? = null,
    val title: String = "",
    val poster: String? = null,
    val image: String? = null,
    val synopsis: String? = null,
    val type: String? = null,
    val episodes: Int? = null,
    val status: String? = null,
    val score: Int? = null,
    val rating: Int? = null,
    val year: Int? = null,
    val season: String? = null,
    @Serializable(with = FlexStringListSerializer::class)
    val genres: List<String> = emptyList(),
    val duration: Int? = null,
    val popularity: Int? = null,
    @Serializable(with = FlexStringListSerializer::class)
    val studios: List<String> = emptyList(),
    val trailer: Trailer? = null,
    val bannerImage: String? = null,
    val relations: List<Anime> = emptyList(),
    val recommendations: List<Anime> = emptyList(),
)

@Serializable
data class Trailer(
    @SerialName("youtube_id") val youtubeId: String? = null,
    val url: String? = null,
)

/**
 * Handles both `["Adventure"]` and `[{"mal_id":2,"name":"Adventure"}]` formats.
 * Extracts "name" from objects, passes strings through.
 */
object FlexStringListSerializer : KSerializer<List<String>> {
    private val delegateSerializer = ListSerializer(JsonElement.serializer())
    override val descriptor: SerialDescriptor = delegateSerializer.descriptor

    override fun serialize(encoder: Encoder, value: List<String>) {
        val jsonEncoder = encoder as JsonEncoder
        val array = JsonArray(value.map { JsonPrimitive(it) })
        jsonEncoder.encodeJsonElement(array)
    }

    override fun deserialize(decoder: Decoder): List<String> {
        val jsonDecoder = decoder as JsonDecoder
        val array = jsonDecoder.decodeJsonElement().jsonArray
        return array.mapNotNull { element ->
            when (element) {
                is JsonPrimitive -> element.contentOrNull
                is JsonObject -> element["name"]?.jsonPrimitive?.contentOrNull
                else -> null
            }
        }
    }
}
