package expo.modules.audioeffects

import android.app.ActivityManager
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DeviceInfoModule : Module() {
    private var trimMemoryCallback: ComponentCallbacks2? = null
    
    override fun definition() = ModuleDefinition {
        Name("DeviceInfoModule")
        
        Events("onTrimMemory", "onLowMemory")
        
        OnCreate {
            registerTrimMemoryCallback()
        }
        
        OnDestroy {
            unregisterTrimMemoryCallback()
        }
        
        AsyncFunction("getMemoryInfo") {
            val context = appContext.reactContext ?: return@AsyncFunction mapOf<String, Any>()
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memInfo)
            
            val totalRamMB = memInfo.totalMem / (1024 * 1024)
            val availableRamMB = memInfo.availMem / (1024 * 1024)
            val isLowRamDevice = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                activityManager.isLowRamDevice
            } else {
                totalRamMB < 1024
            }
            
            mapOf(
                "totalRamMB" to totalRamMB,
                "availableRamMB" to availableRamMB,
                "threshold" to (memInfo.threshold / (1024 * 1024)),
                "lowMemory" to memInfo.lowMemory,
                "isLowRamDevice" to isLowRamDevice,
                "memoryClass" to activityManager.memoryClass,
                "largeMemoryClass" to activityManager.largeMemoryClass
            )
        }
        
        Function("getMemoryClass") {
            val context = appContext.reactContext ?: return@Function "medium"
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memInfo)
            
            val totalRamMB = memInfo.totalMem / (1024 * 1024)
            when {
                totalRamMB < 3072 -> "low"
                totalRamMB < 6144 -> "medium"
                else -> "high"
            }
        }
        
        Function("triggerGC") {
            System.gc()
            Runtime.getRuntime().gc()
            android.util.Log.d("DeviceInfoModule", "Manual GC triggered")
            true
        }
        
        Function("getAvailableMemoryMB") {
            val context = appContext.reactContext ?: return@Function 0L
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memInfo)
            memInfo.availMem / (1024 * 1024)
        }
        
        Function("isLowMemory") {
            val context = appContext.reactContext ?: return@Function false
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memInfo)
            memInfo.lowMemory
        }
    }
    
    private fun registerTrimMemoryCallback() {
        val context = appContext.reactContext ?: return
        
        trimMemoryCallback = object : ComponentCallbacks2 {
            override fun onTrimMemory(level: Int) {
                val levelName = when (level) {
                    ComponentCallbacks2.TRIM_MEMORY_RUNNING_MODERATE -> "RUNNING_MODERATE"
                    ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW -> "RUNNING_LOW"
                    ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL -> "RUNNING_CRITICAL"
                    ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> "UI_HIDDEN"
                    ComponentCallbacks2.TRIM_MEMORY_BACKGROUND -> "BACKGROUND"
                    ComponentCallbacks2.TRIM_MEMORY_MODERATE -> "MODERATE"
                    ComponentCallbacks2.TRIM_MEMORY_COMPLETE -> "COMPLETE"
                    else -> "UNKNOWN($level)"
                }
                
                android.util.Log.d("DeviceInfoModule", "onTrimMemory: $levelName")
                
                sendEvent("onTrimMemory", mapOf(
                    "level" to level,
                    "levelName" to levelName,
                    "shouldReleaseCaches" to (level >= ComponentCallbacks2.TRIM_MEMORY_BACKGROUND),
                    "isCritical" to (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL || level == ComponentCallbacks2.TRIM_MEMORY_COMPLETE)
                ))
                
                if (level >= ComponentCallbacks2.TRIM_MEMORY_MODERATE) {
                    releaseInternalCaches()
                }
            }
            
            override fun onConfigurationChanged(newConfig: Configuration) {}
            
            override fun onLowMemory() {
                android.util.Log.w("DeviceInfoModule", "onLowMemory triggered!")
                sendEvent("onLowMemory", mapOf(
                    "timestamp" to System.currentTimeMillis()
                ))
                releaseInternalCaches()
            }
        }
        
        context.registerComponentCallbacks(trimMemoryCallback)
        android.util.Log.d("DeviceInfoModule", "Registered trim memory callback")
    }
    
    private fun unregisterTrimMemoryCallback() {
        trimMemoryCallback?.let { callback ->
            appContext.reactContext?.unregisterComponentCallbacks(callback)
            android.util.Log.d("DeviceInfoModule", "Unregistered trim memory callback")
        }
        trimMemoryCallback = null
    }
    
    private fun releaseInternalCaches() {
        SoftwareDSPAudioProcessor.getInstance()?.clearDelayBuffers()
        
        NeuralAudioProcessorTFLite.getInstance()?.let { neural ->
            if (!neural.isEnabled()) {
                neural.releaseModel()
            }
        }
        
        System.gc()
        android.util.Log.d("DeviceInfoModule", "Released internal caches due to memory pressure")
    }
}
