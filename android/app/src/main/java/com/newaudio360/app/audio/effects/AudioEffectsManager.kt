package com.newaudio360.app.audio.effects

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

data class EqualizerBandInfo(
    val band: Int,
    val centerFreq: Int,
    val minLevel: Int,
    val maxLevel: Int
)

data class EqualizerConfig(
    val numberOfBands: Int = 0,
    val minLevel: Int = 0,
    val maxLevel: Int = 0,
    val bands: List<EqualizerBandInfo> = emptyList(),
    val presets: List<String> = emptyList()
)

data class AudioEffectsState(
    val isAttached: Boolean = false,
    val equalizerEnabled: Boolean = false,
    val bassBoostEnabled: Boolean = false,
    val virtualizerEnabled: Boolean = false,
    val currentPreset: Int = -1,
    val bandLevels: List<Int> = emptyList(),
    val bassBoostStrength: Int = 0,
    val virtualizerStrength: Int = 0
)

@Singleton
class AudioEffectsManager @Inject constructor() {

    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var virtualizer: Virtualizer? = null
    private var audioSessionId: Int = 0

    private val _state = MutableStateFlow(AudioEffectsState())
    val state: StateFlow<AudioEffectsState> = _state.asStateFlow()

    private val _equalizerConfig = MutableStateFlow(EqualizerConfig())
    val equalizerConfig: StateFlow<EqualizerConfig> = _equalizerConfig.asStateFlow()

    fun attach(sessionId: Int): Result<EqualizerConfig> {
        return try {
            release()

            audioSessionId = sessionId

            equalizer = Equalizer(0, sessionId).apply {
                enabled = false
            }

            bassBoost = BassBoost(0, sessionId).apply {
                enabled = false
            }

            virtualizer = Virtualizer(0, sessionId).apply {
                enabled = false
            }

            val eq = equalizer!!
            val bands = eq.numberOfBands.toInt()
            val bandInfo = mutableListOf<EqualizerBandInfo>()

            for (i in 0 until bands) {
                val band = i.toShort()
                bandInfo.add(
                    EqualizerBandInfo(
                        band = i,
                        centerFreq = eq.getCenterFreq(band),
                        minLevel = eq.bandLevelRange[0].toInt(),
                        maxLevel = eq.bandLevelRange[1].toInt()
                    )
                )
            }

            val presetNames = mutableListOf<String>()
            for (i in 0 until eq.numberOfPresets) {
                presetNames.add(eq.getPresetName(i.toShort()))
            }

            val config = EqualizerConfig(
                numberOfBands = bands,
                minLevel = eq.bandLevelRange[0].toInt(),
                maxLevel = eq.bandLevelRange[1].toInt(),
                bands = bandInfo,
                presets = presetNames
            )

            _equalizerConfig.value = config
            _state.value = AudioEffectsState(isAttached = true)
            updateState()

            Result.success(config)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setEqualizerEnabled(enabled: Boolean): Result<Unit> {
        return try {
            equalizer?.enabled = enabled
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setBandLevel(band: Int, level: Int): Result<Unit> {
        return try {
            equalizer?.setBandLevel(band.toShort(), level.toShort())
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getBandLevel(band: Int): Int {
        return equalizer?.getBandLevel(band.toShort())?.toInt() ?: 0
    }

    fun usePreset(preset: Int): Result<Unit> {
        return try {
            equalizer?.usePreset(preset.toShort())
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getCurrentPreset(): Int {
        return equalizer?.currentPreset?.toInt() ?: -1
    }

    fun setCustomBands(levels: List<Int>): Result<Unit> {
        return try {
            val eq = equalizer ?: return Result.failure(IllegalStateException("Equalizer not attached"))

            for ((band, level) in levels.withIndex()) {
                if (band < eq.numberOfBands) {
                    eq.setBandLevel(band.toShort(), level.toShort())
                }
            }
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getAllBandLevels(): List<Int> {
        val eq = equalizer ?: return emptyList()
        return (0 until eq.numberOfBands).map { band ->
            eq.getBandLevel(band.toShort()).toInt()
        }
    }

    fun setBassBoostEnabled(enabled: Boolean): Result<Unit> {
        return try {
            bassBoost?.enabled = enabled
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setBassBoostStrength(strength: Int): Result<Unit> {
        return try {
            val clampedStrength = strength.coerceIn(0, 1000).toShort()
            bassBoost?.setStrength(clampedStrength)
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getBassBoostStrength(): Int {
        return bassBoost?.roundedStrength?.toInt() ?: 0
    }

    fun isBassBoostStrengthSupported(): Boolean {
        return bassBoost?.strengthSupported ?: false
    }

    fun setVirtualizerEnabled(enabled: Boolean): Result<Unit> {
        return try {
            virtualizer?.enabled = enabled
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setVirtualizerStrength(strength: Int): Result<Unit> {
        return try {
            val clampedStrength = strength.coerceIn(0, 1000).toShort()
            virtualizer?.setStrength(clampedStrength)
            updateState()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getVirtualizerStrength(): Int {
        return virtualizer?.roundedStrength?.toInt() ?: 0
    }

    fun isVirtualizerStrengthSupported(): Boolean {
        return virtualizer?.strengthSupported ?: false
    }

    private fun updateState() {
        val eq = equalizer
        val bb = bassBoost
        val virt = virtualizer

        val bandLevels = if (eq != null) {
            (0 until eq.numberOfBands).map { band ->
                eq.getBandLevel(band.toShort()).toInt()
            }
        } else {
            emptyList()
        }

        _state.value = AudioEffectsState(
            isAttached = audioSessionId != 0,
            equalizerEnabled = eq?.enabled ?: false,
            bassBoostEnabled = bb?.enabled ?: false,
            virtualizerEnabled = virt?.enabled ?: false,
            currentPreset = eq?.currentPreset?.toInt() ?: -1,
            bandLevels = bandLevels,
            bassBoostStrength = bb?.roundedStrength?.toInt() ?: 0,
            virtualizerStrength = virt?.roundedStrength?.toInt() ?: 0
        )
    }

    fun release() {
        equalizer?.release()
        equalizer = null
        bassBoost?.release()
        bassBoost = null
        virtualizer?.release()
        virtualizer = null
        audioSessionId = 0
        _state.value = AudioEffectsState()
        _equalizerConfig.value = EqualizerConfig()
    }
}
