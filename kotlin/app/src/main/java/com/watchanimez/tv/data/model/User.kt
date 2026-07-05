package com.watchanimez.tv.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    val token: String? = null,
    val message: String? = null,
    val user: User? = null,
)

@Serializable
data class User(
    val id: String = "",
    val email: String = "",
    val profiles: List<Profile> = emptyList(),
)

@Serializable
data class Profile(
    val id: String = "",
    val userId: String? = null,
    val name: String = "",
    val avatar: String? = null,
    val autoNext: Boolean = true,
    val autoSkip: Boolean = false,
    val language: String = "multi",
    val theme: String? = null,
)
