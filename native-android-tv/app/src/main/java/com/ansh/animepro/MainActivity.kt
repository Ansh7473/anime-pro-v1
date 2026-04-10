package com.ansh.animepro

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*

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
                // Simplified Sidebar
                TVSidebar()
                
                // Main Content
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 48.dp, vertical = 27.dp)
                ) {
                    TVHeroSection()
                    Spacer(modifier = Modifier.height(32.dp))
                    AnimeRow("Trending Now")
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
        // Logo
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
fun TVHeroSection() {
    Surface(
        onClick = {},
        modifier = Modifier
            .fillMaxWidth()
            .height(350.dp),
        colors = ClickableSurfaceDefaults.colors(containerColor = Color(0xFF141414)),
        shape = ClickableSurfaceDefaults.shape(shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp))
    ) {
        Box(modifier = Modifier.padding(32.dp)) {
            Column {
                Text(
                    "Featured Anime", 
                    style = MaterialTheme.typography.headlineLarge,
                    color = Color.White
                )
                Text(
                    "Experience the next generation of anime streaming.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.Gray
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun AnimeRow(title: String) {
    Column {
        Text(title, style = MaterialTheme.typography.headlineSmall, color = Color.White)
        Spacer(modifier = Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            repeat(5) {
                Surface(
                    onClick = {},
                    modifier = Modifier.size(width = 180.dp, height = 270.dp),
                    colors = ClickableSurfaceDefaults.colors(containerColor = Color(0xFF181818)),
                    shape = ClickableSurfaceDefaults.shape(shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
                ) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                        Text("Anime $it", color = Color.White)
                    }
                }
            }
        }
    }
}
