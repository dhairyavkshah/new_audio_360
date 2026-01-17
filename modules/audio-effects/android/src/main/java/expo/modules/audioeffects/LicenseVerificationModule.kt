package expo.modules.audioeffects

import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class LicenseVerificationModule : Module() {
    
    companion object {
        private val VALID_INSTALLERS = listOf(
            "com.android.vending"
        )
    }
    
    override fun definition() = ModuleDefinition {
        Name("LicenseVerificationModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("getInstallerPackageName") { promise: Promise ->
            try {
                val context = appContext.reactContext
                    ?: throw Exception("Context not available")
                
                val packageName = context.packageName
                val packageManager = context.packageManager
                
                val installerPackage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    try {
                        val installSourceInfo = packageManager.getInstallSourceInfo(packageName)
                        installSourceInfo.installingPackageName
                    } catch (e: Exception) {
                        @Suppress("DEPRECATION")
                        packageManager.getInstallerPackageName(packageName)
                    }
                } else {
                    @Suppress("DEPRECATION")
                    packageManager.getInstallerPackageName(packageName)
                }
                
                promise.resolve(mapOf(
                    "installerPackageName" to (installerPackage ?: "unknown"),
                    "packageName" to packageName
                ))
            } catch (e: Exception) {
                promise.resolve(mapOf(
                    "installerPackageName" to "error",
                    "error" to e.message
                ))
            }
        }
        
        AsyncFunction("isPlayStoreInstall") { promise: Promise ->
            try {
                val context = appContext.reactContext
                    ?: throw Exception("Context not available")
                
                val packageName = context.packageName
                val packageManager = context.packageManager
                
                val installerPackage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    try {
                        val installSourceInfo = packageManager.getInstallSourceInfo(packageName)
                        installSourceInfo.installingPackageName
                    } catch (e: Exception) {
                        @Suppress("DEPRECATION")
                        packageManager.getInstallerPackageName(packageName)
                    }
                } else {
                    @Suppress("DEPRECATION")
                    packageManager.getInstallerPackageName(packageName)
                }
                
                val isValid = installerPackage != null && VALID_INSTALLERS.contains(installerPackage)
                
                promise.resolve(mapOf(
                    "isPlayStoreInstall" to isValid,
                    "installerPackageName" to (installerPackage ?: "unknown")
                ))
            } catch (e: Exception) {
                promise.resolve(mapOf(
                    "isPlayStoreInstall" to false,
                    "error" to e.message
                ))
            }
        }
    }
}
