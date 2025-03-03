import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class EncryptedSharedPreferencesModule(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
    private val encryptedSharedPreferences = EncryptedSharedPreferences.create(
        context,
        "encrypted_shared_preferences",
        MasterKeyBuilder.getMasterKey(context),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    override fun getName(): String {
        return "EncryptedSharedPreferences"
    }

    @ReactMethod
    fun setItem(key: String, value: String, promise: Promise) {
        try {
            val editor: SharedPreferences.Editor = encryptedSharedPreferences.edit()
            editor.putString(key, value)
            editor.apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getItem(key: String, promise: Promise) {
        try {
            val item = encryptedSharedPreferences.getString(key, null)
            if (item.isNullOrEmpty()) {
                promise.resolve(null)
            } else {
                promise.resolve(item)
            }
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun removeItem(key: String, promise: Promise) {
        try {
            val editor: SharedPreferences.Editor = encryptedSharedPreferences.edit()
            editor.remove(key)
            editor.apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }
}