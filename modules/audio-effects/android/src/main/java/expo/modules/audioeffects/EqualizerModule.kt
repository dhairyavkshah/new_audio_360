package expo.modules.audioeffects

import android.media.audiofx.Equalizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class EqualizerModule : Module() {
    private var equalizer: Equalizer? = null
    private var audioSessionId: Int = 0

    override fun definition() = ModuleDefinition {
        Name("EqualizerModule")

        Function("isAvailable") { true }

        AsyncFunction("attach") { sessionId: Int, promise: Promise ->
            try {
                release()
                audioSessionId = sessionId
                equalizer = Equalizer(0, sessionId).apply { enabled = false }

                val eq = equalizer!!
                val bands = eq.numberOfBands.toInt()
                val bandInfo = (0 until bands).map { i ->
                    mapOf(
                        "band" to i,
                        "centerFreq" to eq.getCenterFreq(i.toShort()),
                        "minLevel" to eq.bandLevelRange[0].toInt(),
                        "maxLevel" to eq.bandLevelRange[1].toInt()
                    )
                }

                promise.resolve(mapOf(
                    "success" to true,
                    "numberOfBands" to bands,
                    "minLevel" to eq.bandLevelRange[0].toInt(),
                    "maxLevel" to eq.bandLevelRange[1].toInt(),
                    "bands" to bandInfo
                ))
            } catch (e: Exception) {
                promise.reject("ATTACH_ERROR", e.message, e)
            }
        }

        Function("setEnabled") { enabled: Boolean ->
            try {
                equalizer?.enabled = enabled
                mapOf("success" to true, "enabled" to enabled)
            } catch (e: Exception) {
                mapOf("success" to false, "error" to e.message)
            }
        }

        Function("setBandLevel") { band: Int, level: Int ->
            try {
                equalizer?.setBandLevel(band.toShort(), level.toShort())
                mapOf("success" to true, "band" to band, "level" to level)
            } catch (e: Exception) {
                mapOf("success" to false, "error" to e.message)
            }
        }

        Function("getBandLevel") { band: Int ->
            equalizer?.getBandLevel(band.toShort())?.toInt() ?: 0
        }

        Function("setCustomBands") { levels: List<Int> ->
            try {
                val eq = equalizer ?: return@Function mapOf("success" to false, "error" to "Not attached")

                val sum = levels.sum()
                val offset = if (levels.isNotEmpty()) sum / levels.size else 0
                val zeroSumLevels = levels.map { it - offset }

                zeroSumLevels.forEachIndexed { band, level ->
                    if (band < eq.numberOfBands) {
                        eq.setBandLevel(band.toShort(), level.toShort())
                    }
                }

                mapOf("success" to true, "appliedLevels" to zeroSumLevels)
            } catch (e: Exception) {
                mapOf("success" to false, "error" to e.message)
            }
        }

        Function("getAllBandLevels") {
            val eq = equalizer ?: return@Function emptyList<Int>()
            (0 until eq.numberOfBands).map { eq.getBandLevel(it.toShort()).toInt() }
        }

        Function("getProperties") {
            val eq = equalizer ?: return@Function mapOf<String, Any>()
            mapOf(
                "enabled" to eq.enabled,
                "numberOfBands" to eq.numberOfBands.toInt(),
                "minLevel" to eq.bandLevelRange[0].toInt(),
                "maxLevel" to eq.bandLevelRange[1].toInt()
            )
        }

        AsyncFunction("release") { promise: Promise ->
            try {
                release()
                promise.resolve(mapOf("success" to true))
            } catch (e: Exception) {
                promise.reject("RELEASE_ERROR", e.message, e)
            }
        }
    }

    private fun release() {
        equalizer?.enabled = false
        equalizer?.release()
        equalizer = null
        audioSessionId = 0
    }
}
