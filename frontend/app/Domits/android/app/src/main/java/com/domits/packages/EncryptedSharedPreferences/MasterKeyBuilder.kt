import android.content.Context
import androidx.security.crypto.MasterKey
import com.facebook.react.bridge.*

object MasterKeyBuilder {

    fun getMasterKey(context: ReactApplicationContext): MasterKey {
        return MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }
}