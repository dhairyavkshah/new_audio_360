package com.newaudio360.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.newaudio360.app.ui.components.BottomNavBar
import com.newaudio360.app.ui.components.MiniPlayer
import com.newaudio360.app.ui.screens.LibraryScreen
import com.newaudio360.app.ui.screens.ListenScreen
import com.newaudio360.app.ui.screens.NowPlayingScreen
import com.newaudio360.app.ui.screens.SettingsScreen
import com.newaudio360.app.ui.screens.StudioScreen

sealed class Screen(val route: String) {
    object Listen : Screen("listen")
    object Library : Screen("library")
    object Studio : Screen("studio")
    object Settings : Screen("settings")
    object NowPlaying : Screen("now_playing")
}

@Composable
fun NewAudio360App(
    navController: NavHostController = rememberNavController()
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    
    var showMiniPlayer by remember { mutableStateOf(true) }
    val showBottomBar = currentRoute in listOf(
        Screen.Listen.route,
        Screen.Library.route,
        Screen.Studio.route,
        Screen.Settings.route
    )

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                BottomNavBar(
                    currentRoute = currentRoute ?: Screen.Listen.route,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(Screen.Listen.route) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            NavHost(
                navController = navController,
                startDestination = Screen.Listen.route,
                modifier = Modifier.fillMaxSize()
            ) {
                composable(Screen.Listen.route) {
                    ListenScreen(
                        onSongClick = { /* TODO: Play song */ },
                        onNowPlayingClick = {
                            navController.navigate(Screen.NowPlaying.route)
                        }
                    )
                }
                composable(Screen.Library.route) {
                    LibraryScreen(
                        onCategoryClick = { /* TODO: Navigate to category */ }
                    )
                }
                composable(Screen.Studio.route) {
                    StudioScreen()
                }
                composable(Screen.Settings.route) {
                    SettingsScreen()
                }
                composable(Screen.NowPlaying.route) {
                    NowPlayingScreen(
                        onBackClick = { navController.popBackStack() },
                        onQueueClick = { /* TODO: Show queue */ },
                        onSoundLabClick = { /* TODO: Open Sound Lab */ }
                    )
                }
            }
            
            if (showMiniPlayer && showBottomBar) {
                MiniPlayer(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    onPlayerClick = {
                        navController.navigate(Screen.NowPlaying.route)
                    },
                    onPlayPauseClick = { /* TODO: Toggle playback */ }
                )
            }
        }
    }
}
