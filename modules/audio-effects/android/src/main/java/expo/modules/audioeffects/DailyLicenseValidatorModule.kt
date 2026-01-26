package expo.modules.audioeffects

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.*

/**
 * Native module to expose DailyLicenseValidator to React Native.
 * 
 * This module provides:
 * - Daily subscription re-validation via Google Play Billing
 * - Secure local storage of validation state
 * - Offline-first behavior with graceful degradation
 */
class DailyLicenseValidatorModule : Module() {

    companion object {
        private const val TAG = "DailyLicenseValidatorModule"
    }

    private var validator: DailyLicenseValidator? = null
    private val moduleScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun definition() = ModuleDefinition {
        Name("DailyLicenseValidatorModule")

        OnCreate {
            try {
                val context = appContext.reactContext
                if (context != null) {
                    validator = DailyLicenseValidator(context)
                    Log.d(TAG, "DailyLicenseValidator initialized")
                } else {
                    Log.w(TAG, "Context not available during initialization")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize DailyLicenseValidator: ${e.message}")
            }
        }

        OnDestroy {
            validator?.release()
            moduleScope.cancel()
        }

        Function("isAvailable") {
            return@Function validator != null
        }

        /**
         * Check if validation is needed today.
         * Returns true if this is the first launch of the day.
         */
        Function("needsValidationToday") {
            return@Function validator?.needsValidationToday() ?: true
        }

        /**
         * Get cached validation status without querying Google Play.
         * Use this for quick checks when validation is not needed.
         */
        AsyncFunction("getCachedStatus") { promise: Promise ->
            try {
                val result = validator?.getCachedValidationStatus()
                if (result != null) {
                    promise.resolve(mapOf(
                        "isValid" to result.isValid,
                        "status" to result.status,
                        "needsValidation" to result.needsValidation,
                        "lastValidationDate" to result.lastValidationDate,
                        "productId" to result.productId,
                        "isOffline" to result.isOffline,
                        "error" to result.error
                    ))
                } else {
                    promise.resolve(mapOf(
                        "isValid" to false,
                        "status" to "unavailable",
                        "needsValidation" to true,
                        "lastValidationDate" to null,
                        "productId" to null,
                        "isOffline" to false,
                        "error" to "Validator not initialized"
                    ))
                }
            } catch (e: Exception) {
                Log.e(TAG, "getCachedStatus error: ${e.message}")
                promise.resolve(mapOf(
                    "isValid" to false,
                    "status" to "error",
                    "needsValidation" to true,
                    "error" to e.message
                ))
            }
        }

        /**
         * Perform daily subscription validation.
         * This queries Google Play Billing to verify the purchase.
         * 
         * @param forceValidation If true, validate even if already validated today
         */
        AsyncFunction("validateSubscription") { forceValidation: Boolean, promise: Promise ->
            if (validator == null) {
                promise.resolve(mapOf(
                    "isValid" to false,
                    "status" to "unavailable",
                    "needsValidation" to true,
                    "error" to "Validator not initialized"
                ))
                return@AsyncFunction
            }

            moduleScope.launch {
                try {
                    val result = validator!!.validateSubscription(forceValidation)
                    promise.resolve(mapOf(
                        "isValid" to result.isValid,
                        "status" to result.status,
                        "needsValidation" to result.needsValidation,
                        "lastValidationDate" to result.lastValidationDate,
                        "productId" to result.productId,
                        "isOffline" to result.isOffline,
                        "error" to result.error
                    ))
                } catch (e: Exception) {
                    Log.e(TAG, "validateSubscription error: ${e.message}")
                    promise.resolve(mapOf(
                        "isValid" to false,
                        "status" to "error",
                        "needsValidation" to true,
                        "error" to e.message
                    ))
                }
            }
        }

        /**
         * Quick validation check - uses cache if available, validates only if needed.
         * This is the recommended method for app startup.
         */
        AsyncFunction("performDailyCheck") { promise: Promise ->
            if (validator == null) {
                promise.resolve(mapOf(
                    "isValid" to false,
                    "status" to "unavailable",
                    "needsValidation" to true,
                    "error" to "Validator not initialized"
                ))
                return@AsyncFunction
            }

            moduleScope.launch {
                try {
                    // Check if validation is needed today
                    val needsValidation = validator!!.needsValidationToday()
                    
                    val result = if (needsValidation) {
                        Log.d(TAG, "First launch of the day - performing validation")
                        validator!!.validateSubscription(false)
                    } else {
                        Log.d(TAG, "Already validated today - using cached status")
                        validator!!.getCachedValidationStatus()
                    }
                    
                    promise.resolve(mapOf(
                        "isValid" to result.isValid,
                        "status" to result.status,
                        "needsValidation" to result.needsValidation,
                        "lastValidationDate" to result.lastValidationDate,
                        "productId" to result.productId,
                        "isOffline" to result.isOffline,
                        "error" to result.error,
                        "didValidate" to needsValidation
                    ))
                } catch (e: Exception) {
                    Log.e(TAG, "performDailyCheck error: ${e.message}")
                    promise.resolve(mapOf(
                        "isValid" to false,
                        "status" to "error",
                        "needsValidation" to true,
                        "error" to e.message
                    ))
                }
            }
        }

        /**
         * Clear all stored validation data.
         * Use this when user logs out or for testing.
         */
        Function("clearValidationData") {
            validator?.clearValidationData()
            return@Function mapOf("success" to true)
        }

        /**
         * Force mark as valid for testing/development builds.
         * Should only be used in non-production builds.
         */
        Function("forceValidForTesting") {
            validator?.forceValidForTesting()
            return@Function mapOf("success" to true)
        }

        /**
         * Get the product ID being validated
         */
        Function("getProductId") {
            return@Function DailyLicenseValidator.PRODUCT_ID
        }
    }
}
