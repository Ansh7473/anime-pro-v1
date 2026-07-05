package com.watchanimez.tv.data.model

import kotlinx.serialization.Serializable

@Serializable
data class StreamSourceResponse(
    val status: Int? = null,
    val data: StreamData? = null,
)

@Serializable
data class StreamData(
    val sources: List<StreamSource> = emptyList(),
    val subtitles: List<Subtitle> = emptyList(),
)

@Serializable
data class StreamSource(
    val url: String,
    val quality: String? = null,
    val isM3U8: Boolean = false,
    val isEmbed: Boolean = false,
    val type: String? = null,
    val provider: String? = null,
    val providerName: String? = null,
    val serverName: String? = null,
    val server: String? = null,
    val referer: String? = null,
    val headers: Map<String, String>? = null,
)

@Serializable
data class Subtitle(
    val url: String? = null,
    val lang: String? = null,
)
