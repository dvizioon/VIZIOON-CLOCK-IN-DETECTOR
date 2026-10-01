package expo.modules.clockinmonitor

import android.app.AppOpsManager
import android.content.Context
import android.os.Build
import android.os.Process

internal fun Context.hasUsageAccess(): Boolean {
  val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
  val uid = Process.myUid()
  val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
    appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, uid, packageName)
  } else {
    checkUsageOpBeforeQ(appOps, uid, packageName)
  }
  return mode == AppOpsManager.MODE_ALLOWED
}

/**
 * SDK 36 no longer exposes checkOpNoThrow(int, int, String). Older devices still have it.
 */
private fun checkUsageOpBeforeQ(appOps: AppOpsManager, uid: Int, packageName: String): Int {
  val method = AppOpsManager::class.java.getMethod(
    "checkOpNoThrow",
    Int::class.javaPrimitiveType,
    Int::class.javaPrimitiveType,
    String::class.java,
  )
  return method.invoke(appOps, OP_GET_USAGE_STATS, uid, packageName) as Int
}

private const val OP_GET_USAGE_STATS = 43
