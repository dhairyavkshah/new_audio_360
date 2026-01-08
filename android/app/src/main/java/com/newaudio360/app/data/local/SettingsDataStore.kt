package com.newaudio360.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

@Singleton
class SettingsDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val THEME_MODE = stringPreferencesKey("theme_mode")
        val EQUALIZER_PRESET = intPreferencesKey("equalizer_preset")
        val EQUALIZER_ENABLED = booleanPreferencesKey("equalizer_enabled")
        val BASS_BOOST_ENABLED = booleanPreferencesKey("bass_boost_enabled")
        val BASS_BOOST_STRENGTH = intPreferencesKey("bass_boost_strength")
        val VIRTUALIZER_ENABLED = booleanPreferencesKey("virtualizer_enabled")
        val VIRTUALIZER_STRENGTH = intPreferencesKey("virtualizer_strength")
        val PLAYBACK_SPEED = floatPreferencesKey("playback_speed")
        val REPEAT_MODE = stringPreferencesKey("repeat_mode")
        val SHUFFLE_ENABLED = booleanPreferencesKey("shuffle_enabled")
        val SUBSCRIPTION_TIER = stringPreferencesKey("subscription_tier")
    }

    val themeMode: Flow<String> = context.dataStore.data.map { it[Keys.THEME_MODE] ?: "system" }
    val equalizerPreset: Flow<Int> = context.dataStore.data.map { it[Keys.EQUALIZER_PRESET] ?: -1 }
    val equalizerEnabled: Flow<Boolean> = context.dataStore.data.map { it[Keys.EQUALIZER_ENABLED] ?: false }
    val bassBoostEnabled: Flow<Boolean> = context.dataStore.data.map { it[Keys.BASS_BOOST_ENABLED] ?: false }
    val bassBoostStrength: Flow<Int> = context.dataStore.data.map { it[Keys.BASS_BOOST_STRENGTH] ?: 500 }
    val virtualizerEnabled: Flow<Boolean> = context.dataStore.data.map { it[Keys.VIRTUALIZER_ENABLED] ?: false }
    val virtualizerStrength: Flow<Int> = context.dataStore.data.map { it[Keys.VIRTUALIZER_STRENGTH] ?: 500 }
    val playbackSpeed: Flow<Float> = context.dataStore.data.map { it[Keys.PLAYBACK_SPEED] ?: 1.0f }
    val repeatMode: Flow<String> = context.dataStore.data.map { it[Keys.REPEAT_MODE] ?: "off" }
    val shuffleEnabled: Flow<Boolean> = context.dataStore.data.map { it[Keys.SHUFFLE_ENABLED] ?: false }
    val subscriptionTier: Flow<String> = context.dataStore.data.map { it[Keys.SUBSCRIPTION_TIER] ?: "free" }

    suspend fun setThemeMode(mode: String) {
        context.dataStore.edit { it[Keys.THEME_MODE] = mode }
    }

    suspend fun setEqualizerPreset(preset: Int) {
        context.dataStore.edit { it[Keys.EQUALIZER_PRESET] = preset }
    }

    suspend fun setEqualizerEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.EQUALIZER_ENABLED] = enabled }
    }

    suspend fun setBassBoostEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.BASS_BOOST_ENABLED] = enabled }
    }

    suspend fun setBassBoostStrength(strength: Int) {
        context.dataStore.edit { it[Keys.BASS_BOOST_STRENGTH] = strength }
    }

    suspend fun setVirtualizerEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.VIRTUALIZER_ENABLED] = enabled }
    }

    suspend fun setVirtualizerStrength(strength: Int) {
        context.dataStore.edit { it[Keys.VIRTUALIZER_STRENGTH] = strength }
    }

    suspend fun setPlaybackSpeed(speed: Float) {
        context.dataStore.edit { it[Keys.PLAYBACK_SPEED] = speed }
    }

    suspend fun setRepeatMode(mode: String) {
        context.dataStore.edit { it[Keys.REPEAT_MODE] = mode }
    }

    suspend fun setShuffleEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.SHUFFLE_ENABLED] = enabled }
    }

    suspend fun setSubscriptionTier(tier: String) {
        context.dataStore.edit { it[Keys.SUBSCRIPTION_TIER] = tier }
    }
}
