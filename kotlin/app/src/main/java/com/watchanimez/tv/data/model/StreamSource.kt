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
    val category: String? = null,
    val name: String? = null,
    val provider: String? = null,
    val providerName: String? = null,
    val serverName: String? = null,
    val server: String? = null,
    val referer: String? = null,
    val headers: Map<String, String>? = null,
) {
    /** Derive audio language from category/type/name/serverName */
    val audioLanguage: String
        get() {
            // Check category first (most reliable)
            val cat = category?.lowercase()
            if (cat != null) {
                return when {
                    cat == "dub" -> "DUB"
                    cat == "sub" -> "SUB"
                    cat == "ssub" -> "SUB"
                    cat == "hindi" -> "Hindi"
                    cat == "tamil" -> "Tamil"
                    cat == "telugu" -> "Telugu"
                    cat == "malayalam" -> "Malayalam"
                    cat == "kannada" -> "Kannada"
                    cat == "english" -> "English"
                    cat == "japanese" -> "Japanese"
                    cat == "multi" -> "Multi"
                    else -> cat.replaceFirstChar { it.uppercase() }
                }
            }
            // Check type field
            val t = type?.lowercase()
            if (t == "dub") return "DUB"
            if (t == "sub" || t == "ssub") return "SUB"
            // Check server field for (SUB)/(DUB) pattern
            val srv = server ?: ""
            if (srv.contains("(DUB)", ignoreCase = true)) return "DUB"
            if (srv.contains("(SUB)", ignoreCase = true) || srv.contains("(SSUB)", ignoreCase = true)) return "SUB"
            // Check name/serverName for language keywords
            val n = (name ?: serverName ?: "").lowercase()
            return when {
                "dub" in n -> "DUB"
                "hindi" in n -> "Hindi"
                "tamil" in n -> "Tamil"
                "telugu" in n -> "Telugu"
                "malayalam" in n -> "Malayalam"
                "kannada" in n -> "Kannada"
                "english" in n -> "English"
                "japanese" in n -> "Japanese"
                "multi" in n -> "Multi"
                "soft sub" in n || "hard sub" in n -> "SUB"
                else -> "SUB" // default
            }
        }
}

@Serializable
data class Subtitle(
    val url: String? = null,
    val lang: String? = null,
)
