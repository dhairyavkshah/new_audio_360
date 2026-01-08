package com.newaudio360.app.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarData
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

enum class MessageType {
    SUCCESS,
    ERROR,
    WARNING,
    INFO
}

@Stable
class AppMessageState(
    val snackbarHostState: SnackbarHostState
) {
    suspend fun showMessage(
        message: String,
        type: MessageType = MessageType.INFO,
        duration: SnackbarDuration = SnackbarDuration.Short
    ) {
        snackbarHostState.currentSnackbarData?.dismiss()
        snackbarHostState.showSnackbar(
            message = "${type.name}::$message",
            duration = duration
        )
    }
    
    fun showMessageAsync(
        scope: CoroutineScope,
        message: String,
        type: MessageType = MessageType.INFO,
        duration: SnackbarDuration = SnackbarDuration.Short
    ) {
        scope.launch {
            showMessage(message, type, duration)
        }
    }
}

@Composable
fun rememberAppMessageState(): AppMessageState {
    val snackbarHostState = remember { SnackbarHostState() }
    return remember { AppMessageState(snackbarHostState) }
}

@Composable
fun AppSnackbar(
    snackbarData: SnackbarData,
    modifier: Modifier = Modifier
) {
    val fullMessage = snackbarData.visuals.message
    val parts = fullMessage.split("::", limit = 2)
    val type = try {
        MessageType.valueOf(parts[0])
    } catch (e: Exception) {
        MessageType.INFO
    }
    val message = if (parts.size > 1) parts[1] else fullMessage
    
    val (containerColor, contentColor, icon) = when (type) {
        MessageType.SUCCESS -> Triple(
            Color(0xFF2E7D32),
            Color.White,
            Icons.Default.CheckCircle
        )
        MessageType.ERROR -> Triple(
            Color(0xFFC62828),
            Color.White,
            Icons.Default.Error
        )
        MessageType.WARNING -> Triple(
            Color(0xFFF57C00),
            Color.White,
            Icons.Default.Warning
        )
        MessageType.INFO -> Triple(
            MaterialTheme.colorScheme.inverseSurface,
            MaterialTheme.colorScheme.inverseOnSurface,
            Icons.Default.Info
        )
    }
    
    Snackbar(
        modifier = modifier.padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        containerColor = containerColor,
        contentColor = contentColor,
        action = snackbarData.visuals.actionLabel?.let { actionLabel ->
            {
                Text(
                    text = actionLabel,
                    color = contentColor.copy(alpha = 0.8f)
                )
            }
        }
    ) {
        androidx.compose.foundation.layout.Row(
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.padding(end = 8.dp)
            )
            Text(
                text = message,
                color = contentColor
            )
        }
    }
}
