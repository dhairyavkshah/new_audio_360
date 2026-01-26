package expo.modules.audioeffects

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.util.Calendar
import java.util.TimeZone

internal class SecureStateManager private constructor(private val ctx: Context) {
    
    companion object {
        @Volatile
        private var instance: SecureStateManager? = null
        
        fun gi(ctx: Context): SecureStateManager {
            return instance ?: synchronized(this) {
                instance ?: SecureStateManager(ctx.applicationContext).also { instance = it }
            }
        }
        
        private const val PF = "aec_v2_"
        private const val K_LVD = "lvd"
        private const val K_LVH = "lvh"
        private const val K_DVF = "dvf"
        private const val K_EXP = "exp"
        private const val K_VN = "vn"
        private const val K_RC = "rc"
        private const val K_BRD = "brd"
    }
    
    private val esp: SharedPreferences by lazy {
        try {
            val mk = MasterKey.Builder(ctx)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            
            EncryptedSharedPreferences.create(
                ctx,
                "${PF}state",
                mk,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            ctx.getSharedPreferences("${PF}fb", Context.MODE_PRIVATE)
        }
    }
    
    private val df: String by lazy { RuntimeIntegrity.df(ctx) }
    
    fun svd(ts: Long, expiryTs: Long = 0L) {
        val dn = cdd(ts)
        val vn = RuntimeIntegrity.gpt(ctx)
        val data = "$dn|$df|$expiryTs|$vn"
        val hmac = RuntimeIntegrity.hmv(data, df)
        
        esp.edit()
            .putLong(K_LVD, dn)
            .putString(K_LVH, hmac)
            .putString(K_DVF, df)
            .putLong(K_EXP, expiryTs)
            .putLong(K_VN, vn)
            .apply()
    }
    
    fun ndv(): Boolean {
        val lvd = esp.getLong(K_LVD, 0L)
        if (lvd == 0L) return true
        
        val tdn = cdd(System.currentTimeMillis())
        return tdn > lvd
    }
    
    fun vcs(): EntitlementState {
        val lvd = esp.getLong(K_LVD, 0L)
        val lvh = esp.getString(K_LVH, null)
        val svf = esp.getString(K_DVF, null)
        val exp = esp.getLong(K_EXP, 0L)
        val svn = esp.getLong(K_VN, 0L)
        
        if (lvd == 0L || lvh == null || svf == null) {
            return EntitlementState.NOT_VERIFIED
        }
        
        if (svf != df) {
            return EntitlementState.DEVICE_MISMATCH
        }
        
        val cvn = RuntimeIntegrity.gpt(ctx)
        if (svn > cvn) {
            return EntitlementState.VERSION_ROLLBACK
        }
        
        val data = "$lvd|$df|$exp|$svn"
        if (!RuntimeIntegrity.vhmac(data, df, lvh)) {
            return EntitlementState.TAMPERED
        }
        
        if (exp > 0 && System.currentTimeMillis() > exp) {
            return EntitlementState.EXPIRED
        }
        
        return EntitlementState.VALID
    }
    
    fun glvd(): Long = esp.getLong(K_LVD, 0L)
    
    fun gexp(): Long = esp.getLong(K_EXP, 0L)
    
    fun iex(): Boolean {
        val exp = gexp()
        if (exp <= 0) return false
        val now = System.currentTimeMillis()
        val daysToExpiry = (exp - now) / (24 * 60 * 60 * 1000)
        return daysToExpiry in 0..7
    }
    
    fun src(): Boolean {
        val rc = esp.getInt(K_RC, 0)
        val r = (System.nanoTime() % 100) < (5 + (rc * 2).coerceAtMost(15))
        if (r) {
            esp.edit().putInt(K_RC, 0).apply()
        } else {
            esp.edit().putInt(K_RC, rc + 1).apply()
        }
        return r
    }
    
    fun cs() {
        esp.edit().clear().apply()
    }
    
    fun hbrd(): Boolean {
        val brdDay = esp.getLong(K_BRD, 0L)
        val today = cdd(System.currentTimeMillis())
        return brdDay == today
    }
    
    fun sbrd() {
        val today = cdd(System.currentTimeMillis())
        esp.edit().putLong(K_BRD, today).apply()
    }
    
    private fun cdd(ts: Long): Long {
        val cal = Calendar.getInstance(TimeZone.getDefault())
        cal.timeInMillis = ts
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis / (24 * 60 * 60 * 1000)
    }
    
    enum class EntitlementState {
        VALID,
        NOT_VERIFIED,
        DEVICE_MISMATCH,
        VERSION_ROLLBACK,
        TAMPERED,
        EXPIRED
    }
}
