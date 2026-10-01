package expo.modules.clockinmonitor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (
      action != Intent.ACTION_BOOT_COMPLETED &&
      action != Intent.ACTION_LOCKED_BOOT_COMPLETED
    ) {
      return
    }
    restoreScreenAlerts(context)
    if (!ClockInMonitorService.shouldRestart(context)) return
    val start = Intent(context, ClockInMonitorService::class.java).apply {
      this.action = ClockInMonitorService.ACTION_START
      putExtra(ClockInMonitorService.EXTRA_PACKAGE, ClockInMonitorService.storedPackage(context))
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(start)
      } else {
        context.startService(start)
      }
    } catch (_: IllegalStateException) {
      // O sistema pode recusar o start no boot travado. O BOOT_COMPLETED seguinte tenta de novo.
    }
  }
}
