package expo.modules.audioeffects

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.android.billingclient.api.*
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

/**
 * DailyLicenseValidator - Google Play Billing subscription re-validation
 * 
 * Features:
 * - Validates subscription status once per calendar day (first launch only)
 * - Uses device local date for comparison (not timestamps)
 * - Offline-first: allows app to proceed using last known valid entitlement
 * - Graceful degradation if subscription is invalid/expired
 * - Uses EncryptedSharedPreferences for secure storage
 * 
 * This does NOT replace existing install-time or launch-time license checks.
 * It provides an additional daily re-validation safeguard.
 */
class DailyLicenseValidator(private val context: Context) {

    companion object {
        private const val TAG = "DailyLicenseValidator"
        private const val PREFS_FILE = "daily_license_prefs"
        private const val KEY_LAST_VALIDATION_DATE = "last_validation_date"
        private const val KEY_LAST_VALIDATION_STATUS = "last_validation_status"
        private const val KEY_LAST_PRODUCT_ID = "last_product_id"
        
        // Product ID for New Audio 360 lifetime purchase
        const val PRODUCT_ID = "new_audio_360_lifetime"
        
        // Date format for local date comparison (yyyy-MM-dd)
        private val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        
        // Validation status constants
        const val STATUS_VALID = "valid"
        const val STATUS_INVALID = "invalid"
        const val STATUS_EXPIRED = "expired"
        const val STATUS_UNKNOWN = "unknown"
        const val STATUS_OFFLINE = "offline"
    }

    private var billingClient: BillingClient? = null
    private var encryptedPrefs: SharedPreferences? = null
    
    data class ValidationResult(
        val isValid: Boolean,
        val status: String,
        val needsValidation: Boolean,
        val lastValidationDate: String?,
        val productId: String?,
        val isOffline: Boolean = false,
        val error: String? = null
    )

    init {
        initEncryptedPrefs()
    }

    private fun initEncryptedPrefs() {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            
            encryptedPrefs = EncryptedSharedPreferences.create(
                context,
                PREFS_FILE,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
            Log.d(TAG, "EncryptedSharedPreferences initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize EncryptedSharedPreferences: ${e.message}")
            // Fallback to regular SharedPreferences if encryption fails
            encryptedPrefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
        }
    }

    /**
     * Check if validation is needed today.
     * Returns true if this is the first launch of the day.
     */
    fun needsValidationToday(): Boolean {
        val lastValidationDate = encryptedPrefs?.getString(KEY_LAST_VALIDATION_DATE, null)
        val todayDate = getCurrentLocalDate()
        
        val needsValidation = lastValidationDate != todayDate
        Log.d(TAG, "needsValidationToday: lastDate=$lastValidationDate, today=$todayDate, needs=$needsValidation")
        
        return needsValidation
    }

    /**
     * Get the current local date as a string (yyyy-MM-dd)
     */
    private fun getCurrentLocalDate(): String {
        return DATE_FORMAT.format(Date())
    }

    /**
     * Get cached validation status.
     * Used when offline or when validation is not needed today.
     */
    fun getCachedValidationStatus(): ValidationResult {
        val lastDate = encryptedPrefs?.getString(KEY_LAST_VALIDATION_DATE, null)
        val lastStatus = encryptedPrefs?.getString(KEY_LAST_VALIDATION_STATUS, STATUS_UNKNOWN)
        val lastProductId = encryptedPrefs?.getString(KEY_LAST_PRODUCT_ID, null)
        
        val isValid = lastStatus == STATUS_VALID
        
        return ValidationResult(
            isValid = isValid,
            status = lastStatus ?: STATUS_UNKNOWN,
            needsValidation = needsValidationToday(),
            lastValidationDate = lastDate,
            productId = lastProductId,
            isOffline = false
        )
    }

    /**
     * Perform daily validation using Google Play Billing.
     * This should be called early in app startup after ensuring BillingClient is available.
     * 
     * @param forceValidation If true, validate even if already validated today
     */
    suspend fun validateSubscription(forceValidation: Boolean = false): ValidationResult {
        // Check if validation is needed
        if (!forceValidation && !needsValidationToday()) {
            Log.d(TAG, "Validation not needed today, using cached status")
            return getCachedValidationStatus()
        }
        
        Log.d(TAG, "Starting daily subscription validation")
        
        return withContext(Dispatchers.IO) {
            try {
                val result = performBillingValidation()
                
                // Save validation result
                saveValidationResult(result)
                
                result
            } catch (e: Exception) {
                Log.e(TAG, "Validation error: ${e.message}")
                
                // On error, return cached status with offline flag
                val cached = getCachedValidationStatus()
                ValidationResult(
                    isValid = cached.isValid,
                    status = cached.status,
                    needsValidation = true,
                    lastValidationDate = cached.lastValidationDate,
                    productId = cached.productId,
                    isOffline = true,
                    error = e.message
                )
            }
        }
    }

    private suspend fun performBillingValidation(): ValidationResult = suspendCancellableCoroutine { continuation ->
        // Create BillingClient
        billingClient = BillingClient.newBuilder(context)
            .setListener { _, _ -> /* Purchase updates handled elsewhere */ }
            .enablePendingPurchases()
            .build()
        
        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "BillingClient connected successfully")
                    
                    // Query purchases
                    queryPurchases { result ->
                        if (continuation.isActive) {
                            continuation.resumeWith(Result.success(result))
                        }
                        // Disconnect after query
                        billingClient?.endConnection()
                    }
                } else {
                    Log.w(TAG, "BillingClient setup failed: ${billingResult.responseCode}")
                    
                    // Treat connection failure as offline - use cached status
                    val cached = getCachedValidationStatus()
                    if (continuation.isActive) {
                        continuation.resumeWith(Result.success(
                            ValidationResult(
                                isValid = cached.isValid,
                                status = cached.status,
                                needsValidation = true,
                                lastValidationDate = cached.lastValidationDate,
                                productId = cached.productId,
                                isOffline = true,
                                error = "BillingClient connection failed: ${billingResult.responseCode}"
                            )
                        ))
                    }
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "BillingClient disconnected")
            }
        })

        continuation.invokeOnCancellation {
            billingClient?.endConnection()
        }
    }

    private fun queryPurchases(callback: (ValidationResult) -> Unit) {
        // Query for in-app purchases (one-time purchases)
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        
        billingClient?.queryPurchasesAsync(params) { billingResult, purchasesList ->
            Log.d(TAG, "queryPurchases result: ${billingResult.responseCode}, purchases: ${purchasesList.size}")
            
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                // Check for our product
                val validPurchase = purchasesList.find { purchase ->
                    purchase.products.contains(PRODUCT_ID) && 
                    purchase.purchaseState == Purchase.PurchaseState.PURCHASED
                }
                
                if (validPurchase != null) {
                    Log.d(TAG, "Valid purchase found for $PRODUCT_ID")
                    callback(ValidationResult(
                        isValid = true,
                        status = STATUS_VALID,
                        needsValidation = false,
                        lastValidationDate = getCurrentLocalDate(),
                        productId = PRODUCT_ID,
                        isOffline = false
                    ))
                } else {
                    // No valid purchase found
                    Log.d(TAG, "No valid purchase found for $PRODUCT_ID")
                    callback(ValidationResult(
                        isValid = false,
                        status = STATUS_INVALID,
                        needsValidation = false,
                        lastValidationDate = getCurrentLocalDate(),
                        productId = null,
                        isOffline = false
                    ))
                }
            } else {
                // Query failed - treat as offline, use cached status
                Log.w(TAG, "Purchase query failed: ${billingResult.responseCode}")
                val cached = getCachedValidationStatus()
                callback(ValidationResult(
                    isValid = cached.isValid,
                    status = cached.status,
                    needsValidation = true,
                    lastValidationDate = cached.lastValidationDate,
                    productId = cached.productId,
                    isOffline = true,
                    error = "Purchase query failed: ${billingResult.responseCode}"
                ))
            }
        }
    }

    private fun saveValidationResult(result: ValidationResult) {
        if (result.isOffline) {
            // Don't update stored date if we couldn't actually validate
            Log.d(TAG, "Skipping save - offline validation")
            return
        }
        
        encryptedPrefs?.edit()?.apply {
            putString(KEY_LAST_VALIDATION_DATE, getCurrentLocalDate())
            putString(KEY_LAST_VALIDATION_STATUS, result.status)
            putString(KEY_LAST_PRODUCT_ID, result.productId)
            apply()
        }
        
        Log.d(TAG, "Saved validation result: date=${getCurrentLocalDate()}, status=${result.status}")
    }

    /**
     * Clear all stored validation data.
     * Use this when user logs out or for testing.
     */
    fun clearValidationData() {
        encryptedPrefs?.edit()?.clear()?.apply()
        Log.d(TAG, "Validation data cleared")
    }

    /**
     * Force mark as valid for testing/development builds.
     * Should only be used in non-production builds.
     */
    fun forceValidForTesting() {
        encryptedPrefs?.edit()?.apply {
            putString(KEY_LAST_VALIDATION_DATE, getCurrentLocalDate())
            putString(KEY_LAST_VALIDATION_STATUS, STATUS_VALID)
            putString(KEY_LAST_PRODUCT_ID, PRODUCT_ID)
            apply()
        }
        Log.d(TAG, "Forced valid status for testing")
    }

    /**
     * Release resources
     */
    fun release() {
        billingClient?.endConnection()
        billingClient = null
    }
}
