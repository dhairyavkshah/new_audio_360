package expo.modules.audioeffects

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.android.billingclient.api.*
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.*

class AppContextModule : Module() {
    
    private var bc: BillingClient? = null
    private val mh = Handler(Looper.getMainLooper())
    private val cs = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    @Volatile
    private var as_ = 0
    
    companion object {
        private const val PID = "new_audio_360_lifetime"
        
        @Volatile
        private var sv: Int = 0
        
        fun gav(): Int = sv
    }
    
    override fun definition() = ModuleDefinition {
        Name("AppContextModule")
        
        OnCreate {
            cs.launch {
                delay(500)
                iac()
            }
        }
        
        OnDestroy {
            rbc()
            cs.cancel()
        }
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("performSessionCheck") { promise: Promise ->
            cs.launch {
                try {
                    val ctx = appContext.reactContext ?: run {
                        promise.resolve(mcr(false, "context_unavailable"))
                        return@launch
                    }
                    
                    val r = psc(ctx)
                    mh.post { promise.resolve(r) }
                } catch (e: Exception) {
                    mh.post { promise.resolve(mcr(false, "exception")) }
                }
            }
        }
        
        AsyncFunction("getSessionState") { promise: Promise ->
            cs.launch {
                try {
                    val ctx = appContext.reactContext ?: run {
                        promise.resolve(mapOf("state" to "unavailable"))
                        return@launch
                    }
                    
                    val ssm = SecureStateManager.gi(ctx)
                    val es = ssm.vcs()
                    
                    mh.post {
                        promise.resolve(mapOf(
                            "state" to es.name.lowercase(),
                            "needsDaily" to ssm.ndv(),
                            "lastValidation" to ssm.glvd()
                        ))
                    }
                } catch (e: Exception) {
                    mh.post { promise.resolve(mapOf("state" to "error")) }
                }
            }
        }
        
        AsyncFunction("validateInitialSession") { promise: Promise ->
            cs.launch {
                try {
                    val ctx = appContext.reactContext ?: run {
                        promise.resolve(mcr(false, "context_unavailable"))
                        return@launch
                    }
                    
                    if (!RuntimeIntegrity.vsi(ctx)) {
                        as_ = 1
                        sv = 1
                        mh.post { promise.resolve(mcr(false, "integrity_check")) }
                        return@launch
                    }
                    
                    val r = piv(ctx)
                    mh.post { promise.resolve(r) }
                } catch (e: Exception) {
                    mh.post { promise.resolve(mcr(false, "exception")) }
                }
            }
        }
    }
    
    private suspend fun psc(ctx: Context): Map<String, Any> {
        if (!RuntimeIntegrity.vsi(ctx)) {
            as_ = 1
            sv = 1
            return mcr(false, "integrity_check")
        }
        
        val ssm = SecureStateManager.gi(ctx)
        
        if (!ssm.ndv()) {
            val es = ssm.vcs()
            return when (es) {
                SecureStateManager.EntitlementState.VALID -> {
                    sv = 0
                    mcr(true, "cached_valid")
                }
                SecureStateManager.EntitlementState.DEVICE_MISMATCH,
                SecureStateManager.EntitlementState.VERSION_ROLLBACK,
                SecureStateManager.EntitlementState.TAMPERED -> {
                    as_ = 2
                    sv = 2
                    ssm.cs()
                    mcr(false, "cache_integrity")
                }
                SecureStateManager.EntitlementState.EXPIRED -> {
                    if (!ssm.hbrd()) {
                        ssm.sbrd()
                        pbr(ctx, ssm, true)
                    } else {
                        mcr(false, "expired_already_checked")
                    }
                }
                SecureStateManager.EntitlementState.NOT_VERIFIED -> {
                    if (!ssm.hbrd()) {
                        ssm.sbrd()
                        pbr(ctx, ssm, true)
                    } else {
                        mcr(false, "not_verified_already_checked")
                    }
                }
            }
        }
        
        val es = ssm.vcs()
        return when (es) {
            SecureStateManager.EntitlementState.VALID -> {
                val sra = sbr(ssm)
                if (sra) {
                    pbr(ctx, ssm, false)
                } else {
                    ssm.svd(System.currentTimeMillis(), ssm.gexp())
                    sv = 0
                    mcr(true, "daily_cached")
                }
            }
            SecureStateManager.EntitlementState.DEVICE_MISMATCH,
            SecureStateManager.EntitlementState.VERSION_ROLLBACK,
            SecureStateManager.EntitlementState.TAMPERED -> {
                as_ = 2
                sv = 2
                ssm.cs()
                mcr(false, "cache_integrity")
            }
            SecureStateManager.EntitlementState.EXPIRED,
            SecureStateManager.EntitlementState.NOT_VERIFIED -> {
                if (!ssm.hbrd()) {
                    ssm.sbrd()
                    pbr(ctx, ssm, true)
                } else {
                    mcr(false, "already_checked_today")
                }
            }
        }
    }
    
    private fun sbr(ssm: SecureStateManager): Boolean {
        if (ssm.iex()) return true
        
        if (ssm.src()) return true
        
        val ec = RuntimeIntegrity.gcs()
        if (ec != 0) return true
        
        return false
    }
    
    private suspend fun pbr(ctx: Context, ssm: SecureStateManager, required: Boolean): Map<String, Any> {
        return try {
            val br = qpa(ctx)
            
            when (br) {
                BillingResult.VALID -> {
                    ssm.svd(System.currentTimeMillis(), 0L)
                    sv = 0
                    mcr(true, "billing_verified")
                }
                BillingResult.EXPIRED -> {
                    ssm.cs()
                    sv = 3
                    mcr(false, "subscription_expired")
                }
                BillingResult.NOT_FOUND -> {
                    if (required) {
                        sv = 4
                        mcr(false, "not_purchased")
                    } else {
                        ssm.svd(System.currentTimeMillis(), ssm.gexp())
                        sv = 0
                        mcr(true, "offline_grace")
                    }
                }
                BillingResult.ERROR -> {
                    if (!required && ssm.vcs() == SecureStateManager.EntitlementState.VALID) {
                        ssm.svd(System.currentTimeMillis(), ssm.gexp())
                        sv = 0
                        mcr(true, "offline_trusted")
                    } else {
                        mcr(false, "billing_error")
                    }
                }
            }
        } catch (e: Exception) {
            if (!required && ssm.vcs() == SecureStateManager.EntitlementState.VALID) {
                ssm.svd(System.currentTimeMillis(), ssm.gexp())
                sv = 0
                mcr(true, "offline_trusted")
            } else {
                mcr(false, "exception")
            }
        }
    }
    
    private suspend fun piv(ctx: Context): Map<String, Any> {
        val ssm = SecureStateManager.gi(ctx)
        
        return try {
            val br = qpa(ctx)
            
            when (br) {
                BillingResult.VALID -> {
                    ssm.svd(System.currentTimeMillis(), 0L)
                    sv = 0
                    mcr(true, "initial_verified")
                }
                BillingResult.EXPIRED -> {
                    ssm.cs()
                    sv = 3
                    mcr(false, "subscription_expired")
                }
                BillingResult.NOT_FOUND -> {
                    sv = 4
                    mcr(false, "not_purchased")
                }
                BillingResult.ERROR -> {
                    mcr(false, "billing_unavailable")
                }
            }
        } catch (e: Exception) {
            mcr(false, "exception")
        }
    }
    
    private suspend fun qpa(ctx: Context): BillingResult = suspendCancellableCoroutine { cont ->
        try {
            val client = bc ?: BillingClient.newBuilder(ctx)
                .setListener { _, _ -> }
                .enablePendingPurchases()
                .build().also { bc = it }
            
            if (!client.isReady) {
                client.startConnection(object : BillingClientStateListener {
                    override fun onBillingSetupFinished(result: com.android.billingclient.api.BillingResult) {
                        if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                            qp(client, cont)
                        } else {
                            if (cont.isActive) cont.resume(BillingResult.ERROR) {}
                        }
                    }
                    
                    override fun onBillingServiceDisconnected() {
                        if (cont.isActive) cont.resume(BillingResult.ERROR) {}
                    }
                })
            } else {
                qp(client, cont)
            }
        } catch (e: Exception) {
            if (cont.isActive) cont.resume(BillingResult.ERROR) {}
        }
    }
    
    private fun qp(client: BillingClient, cont: CancellableContinuation<BillingResult>) {
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        
        client.queryPurchasesAsync(params) { result, purchases ->
            try {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    val valid = purchases.any { p ->
                        p.products.contains(PID) && 
                        p.purchaseState == Purchase.PurchaseState.PURCHASED &&
                        p.isAcknowledged
                    }
                    
                    if (valid) {
                        if (cont.isActive) cont.resume(BillingResult.VALID) {}
                    } else {
                        if (cont.isActive) cont.resume(BillingResult.NOT_FOUND) {}
                    }
                } else if (result.responseCode == BillingClient.BillingResponseCode.SERVICE_DISCONNECTED) {
                    if (cont.isActive) cont.resume(BillingResult.ERROR) {}
                } else {
                    if (cont.isActive) cont.resume(BillingResult.NOT_FOUND) {}
                }
            } catch (e: Exception) {
                if (cont.isActive) cont.resume(BillingResult.ERROR) {}
            }
        }
    }
    
    private fun mcr(success: Boolean, reason: String): Map<String, Any> {
        return mapOf(
            "valid" to success,
            "reason" to reason,
            "ts" to System.currentTimeMillis()
        )
    }
    
    private suspend fun iac() {
        try {
            val ctx = appContext.reactContext ?: return
            if (!RuntimeIntegrity.vsi(ctx)) {
                as_ = 1
                sv = 1
            }
        } catch (e: Exception) { }
    }
    
    private fun rbc() {
        try {
            bc?.endConnection()
            bc = null
        } catch (e: Exception) { }
    }
    
    private enum class BillingResult {
        VALID,
        EXPIRED,
        NOT_FOUND,
        ERROR
    }
}
