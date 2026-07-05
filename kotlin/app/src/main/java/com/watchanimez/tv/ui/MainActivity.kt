package com.watchanimez.tv.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.runtime.*
import com.watchanimez.tv.ui.theme.WatchAnimezTheme
import com.watchanimez.tv.ui.home.HomeScreen
import com.watchanimez.tv.ui.details.DetailsScreen
import com.watchanimez.tv.ui.player.PlayerScreen
import com.watchanimez.tv.ui.search.SearchScreen
import com.watchanimez.tv.ui.library.LibraryScreen
import com.watchanimez.tv.ui.auth.AuthScreen
import com.watchanimez.tv.ui.profile.ProfileScreen
import com.watchanimez.tv.ui.trending.TrendingScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WatchAnimezTheme {
                val navStack = remember { mutableStateListOf<Screen>(Screen.Home) }
                val currentScreen = navStack.last()

                BackHandler(enabled = navStack.size > 1) {
                    navStack.removeLast()
                }

                when (val s = currentScreen) {
                    is Screen.Home -> HomeScreen(
                        onAnimeClick = { navStack.add(Screen.Details(it)) },
                        onNavigate = { dest ->
                            when (dest) {
                                "search" -> navStack.add(Screen.Search)
                                "watchlist" -> navStack.add(Screen.Library("watchlist"))
                                "favorites" -> navStack.add(Screen.Library("favorites"))
                                "trending" -> navStack.add(Screen.Trending)
                                "profile" -> navStack.add(Screen.Profile)
                            }
                        },
                    )
                    is Screen.Trending -> TrendingScreen(
                        onAnimeClick = { navStack.add(Screen.Details(it)) },
                        onBack = { navStack.removeLast() },
                    )
                    is Screen.Details -> DetailsScreen(
                        animeId = s.animeId,
                        onBack = { navStack.removeLast() },
                        onPlay = { animeId, ep -> navStack.add(Screen.Player(animeId, ep)) },
                        onAnimeClick = { navStack.add(Screen.Details(it)) },
                    )
                    is Screen.Player -> PlayerScreen(
                        animeId = s.animeId,
                        episodeNumber = s.episode,
                        onBack = { navStack.removeLast() },
                        onNextEpisode = {
                            navStack.removeLast()
                            navStack.add(Screen.Player(s.animeId, s.episode + 1))
                        },
                        onPreviousEpisode = if (s.episode > 1) {
                            {
                                navStack.removeLast()
                                navStack.add(Screen.Player(s.animeId, s.episode - 1))
                            }
                        } else null,
                    )
                    is Screen.Search -> SearchScreen(
                        onAnimeClick = { navStack.add(Screen.Details(it)) },
                        onBack = { navStack.removeLast() },
                    )
                    is Screen.Library -> LibraryScreen(
                        initialTab = s.tab,
                        onAnimeClick = { navStack.add(Screen.Details(it)) },
                        onBack = { navStack.removeLast() },
                    )
                    is Screen.Auth -> AuthScreen(
                        onBack = { navStack.removeLast() },
                        onLoginSuccess = { navStack.removeLast() },
                    )
                    is Screen.Profile -> ProfileScreen(
                        onBack = { navStack.removeLast() },
                        onLogout = {
                            while (navStack.size > 1) navStack.removeLast()
                        },
                        onNavigateToAuth = {
                            navStack.add(Screen.Auth)
                        },
                    )
                }
            }
        }
    }
}

sealed class Screen {
    data object Home : Screen()
    data object Trending : Screen()
    data class Details(val animeId: Int) : Screen()
    data class Player(val animeId: Int, val episode: Int) : Screen()
    data object Search : Screen()
    data class Library(val tab: String = "watchlist") : Screen()
    data object Auth : Screen()
    data object Profile : Screen()
}
