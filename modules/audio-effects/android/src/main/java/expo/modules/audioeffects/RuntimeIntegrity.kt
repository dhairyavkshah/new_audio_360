package expo.modules.audioeffects

import android.content.Context
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import android.provider.Settings
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

internal object RuntimeIntegrity {
    
    // Expected signing certificate SHA-256 fingerprints (full 64-char hex, no colons)
    // PRODUCTION: Replace these with your actual signing certificate fingerprints
    // Get fingerprint: keytool -list -v -keystore your.keystore -alias your_alias | grep SHA256
    // Example: "AB1234...EF" (64 chars, no colons, uppercase)
    private val _vc = arrayOf(
        "PLACEHOLDER_RELEASE_CERT_SHA256_FINGERPRINT_64_CHARS_REPLACE_ME_BEFORE_PRODUCTION_DEPLOY",
        "PLACEHOLDER_DEBUG_CERT_SHA256_FINGERPRINT_64_CHARS_REPLACE_BEFORE_PRODUCTION_DEPLOYMENT"
    )
    
    @Volatile
    private var _cs: Int = 0
    
    fun df(ctx: Context): String {
        val sb = StringBuilder()
        try {
            sb.append(gsi(ctx))
            sb.append(gdi(ctx))
            sb.append(gpn(ctx))
        } catch (e: Exception) {
            sb.append(System.currentTimeMillis().toString(16))
        }
        return hs(sb.toString()).take(32)
    }
    
    private fun gdi(ctx: Context): String {
        return try {
            Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID) ?: ""
        } catch (e: Exception) { "" }
    }
    
    private fun gsi(ctx: Context): String {
        return try {
            val pm = ctx.packageManager
            val pn = ctx.packageName
            @Suppress("DEPRECATION")
            val sigs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val pi = pm.getPackageInfo(pn, PackageManager.GET_SIGNING_CERTIFICATES)
                pi.signingInfo?.apkContentsSigners ?: arrayOf()
            } else {
                val pi = pm.getPackageInfo(pn, PackageManager.GET_SIGNATURES)
                pi.signatures ?: arrayOf()
            }
            if (sigs.isNotEmpty()) {
                hs(sigs[0].toByteArray().take(64).toByteArray().toString(Charsets.UTF_8))
            } else ""
        } catch (e: Exception) { "" }
    }
    
    private fun gpn(ctx: Context): String = ctx.packageName
    
    fun vsi(ctx: Context): Boolean {
        return try {
            val pm = ctx.packageManager
            val pn = ctx.packageName
            @Suppress("DEPRECATION")
            val sigs: Array<Signature> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val pi = pm.getPackageInfo(pn, PackageManager.GET_SIGNING_CERTIFICATES)
                pi.signingInfo?.apkContentsSigners ?: arrayOf()
            } else {
                val pi = pm.getPackageInfo(pn, PackageManager.GET_SIGNATURES)
                pi.signatures ?: arrayOf()
            }
            
            if (sigs.isEmpty()) {
                _cs = 1
                return false
            }
            
            val sh = hs(sigs[0].toByteArray())
            val ev = sev(sh)
            
            _cs = if (ev) 0 else 2
            ev
        } catch (e: Exception) {
            _cs = 3
            false
        }
    }
    
    private fun sev(sh: String): Boolean {
        val normalizedSh = sh.replace(":", "").uppercase()
        for (vc in _vc) {
            val normalizedVc = vc.replace(":", "").uppercase()
            if (normalizedSh == normalizedVc) return true
        }
        return false
    }
    
    fun gcs(): Int = _cs
    
    fun hmv(data: String, key: String): String {
        return try {
            val sk = SecretKeySpec(key.toByteArray(), "HmacSHA256")
            val mac = Mac.getInstance("HmacSHA256")
            mac.init(sk)
            mac.doFinal(data.toByteArray()).joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            hs(data + key)
        }
    }
    
    fun vhmac(data: String, key: String, expected: String): Boolean {
        val computed = hmv(data, key)
        return ct(computed, expected)
    }
    
    private fun ct(a: String, b: String): Boolean {
        if (a.length != b.length) return false
        var r = 0
        for (i in a.indices) {
            r = r or (a[i].code xor b[i].code)
        }
        return r == 0
    }
    
    private fun hs(input: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        return md.digest(input.toByteArray()).joinToString("") { "%02x".format(it) }
    }
    
    fun hs(input: ByteArray): String {
        val md = MessageDigest.getInstance("SHA-256")
        return md.digest(input).joinToString("") { "%02x".format(it) }
    }
    
    fun gpt(ctx: Context): Long {
        return try {
            val pm = ctx.packageManager
            val pi = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getPackageInfo(ctx.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                pm.getPackageInfo(ctx.packageName, 0)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pi.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pi.versionCode.toLong()
            }
        } catch (e: Exception) { 0L }
    }
}
