package com.ansh.animepro

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalTvMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AnimeProApp()
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun AnimeProApp() {
    var trendingAnime by remember { mutableStateOf<List<Anime>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            val response = withContext(Dispatchers.IO) {
                RetrofitClient.instance.getTrending()
            }
            trendingAnime = response.results ?: response.data ?: emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            background = Color(0xFF050505),
            surface = Color(0xFF0F0F0F),
            primary = Color(0xFFE50914)
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            shape = ClickableSurfaceDefaults.shape(shape = androidx.compose.foundation.shape.RectangleShape)
        ) {
            Row(modifier = Modifier.fillMaxSize()) {
                TVSidebar()
                
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 48.dp, vertical = 27.dp)
                ) {
                    if (trendingAnime.isNotEmpty()) {
                        TVHeroSection(trendingAnime.first())
                    }
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    if (isLoading) {
                        Text("Loading Anime Catalog...", color = Color.White)
                    } else {
                        AnimeSourceRow("Trending Now", trendingAnime)
                    }
                }
            }
        }
    }
}

@Composable
fun TVSidebar() {
    Column(
        modifier = Modifier
            .fillMaxHeight()
            .width(100.dp)
            .background(Color(0xFF080808))
            .padding(vertical = 32.dp),
        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(50.dp)
                .background(Color(0xFFE50914), androidx.compose.foundation.shape.RoundedCornerShape(12.dp)),
            contentAlignment = androidx.compose.ui.Alignment.Center
        ) {
            Text("AP", color = Color.White, style = MaterialTheme.typography.headlineSmall)
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TVHeroSection(anime: Anime) {
    Surface(
        onClick = {},
        modifier = Modifier
            .fillMaxWidth()
            .height(400.dp),
        colors = ClickableSurfaceDefaults.colors(containerColor = Color(0xFF141414)),
        shape = ClickableSurfaceDefaults.shape(shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp))
    ) {
        Box {
            AsyncImage(
                model = anime.getDisplayPoster(),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                alpha = 0.4f
            )
            
            Column(modifier = Modifier.padding(48.dp).align(androidx.compose.ui.Alignment.BottomStart)) {
                Text(
                    anime.getDisplayTitle(), 
                    style = MaterialTheme.typography.displayMedium,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = {}) {
                    Text("Watch Now")
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun AnimeSourceRow(title: String, items: List<Anime>) {
    Column {
        Text(title, style = MaterialTheme.typography.headlineSmall, color = Color.White)
        Spacer(modifier = Modifier.height(16.dp))
        androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            items(items.size) { index ->
                val anime = items[index]
                Surface(
                    onClick = {},
                    modifier = Modifier.size(width = 200.dp, height = 300.dp),
                    colors = ClickableSurfaceDefaults.colors(containerColor = Color(0xFF181818)),
                    shape = ClickableSurfaceDefaults.shape(shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
                ) {
                    Column {
                        AsyncImage(
                            model = anime.getDisplayPoster(),
                            contentDescription = anime.getDisplayTitle(),
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            contentScale = ContentScale.Crop
                        )
                        Box(modifier = Modifier.padding(12.dp)) {
                            Text(
                                anime.getDisplayTitle(), 
                                color = Color.White, 
                                maxLines = 1,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
        }
    }
}
