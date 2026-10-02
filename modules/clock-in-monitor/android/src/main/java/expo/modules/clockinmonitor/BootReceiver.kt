package expo.modules.clockinmonitor

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action !in BOOT_ACTIONS) return

    val app = context.applicationContext
    try {
      restoreScreenAlerts(app)
    } catch (_: Exception) {
      // O alarme da tela tenta de novo na próxima abertura.
    }
    if (!ClockInMonitorService.shouldRestart(app)) return

    scheduleRetry(app, RETRY_DELAY_MS)
    startMonitor(app)
  }

  companion object {
    private const val RETRY_DELAY_MS = 30_000L
    private const val RETRY_REQUEST = 4102
    private const val ACTION_QUICKBOOT = "android.intent.action.QUICKBOOT_POWERON"
    private val BOOT_ACTIONS = setOf(
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_LOCKED_BOOT_COMPLETED,
      Intent.ACTION_USER_UNLOCKED,
      ACTION_QUICKBOOT,
    )

    fun startMonitor(context: Context): Boolean {
      val start = Intent(context, ClockInMonitorService::class.java).apply {
        action = ClockInMonitorService.ACTION_START
        putExtra(ClockInMonitorService.EXTRA_PACKAGE, ClockInMonitorService.storedPackage(context))
      }
      return try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(start)
        } else {
          context.startService(start)
        }
        true
      } catch (_: Exception) {
        false
      }
    }

    fun scheduleRetry(context: Context, delayMs: Long) {
      val alarm = context.getSystemService(AlarmManager::class.java) ?: return
      val at = System.currentTimeMillis() + delayMs
      val pending = restartPending(context)
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarm.canScheduleExactAlarms()) {
          alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        } else {
          alarm.set(AlarmManager.RTC_WAKEUP, at, pending)
        }
      } catch (_: SecurityException) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        }
      }
    }

    fun cancelRetry(context: Context) {
      val alarm = context.getSystemService(AlarmManager::class.java) ?: return
      alarm.cancel(restartPending(context))
    }

    private fun restartPending(context: Context): PendingIntent {
      val intent = Intent(context, ClockInMonitorService::class.java).apply {
        action = ClockInMonitorService.ACTION_START
        putExtra(ClockInMonitorService.EXTRA_PACKAGE, ClockInMonitorService.storedPackage(context))
      }
      val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        PendingIntent.getForegroundService(context, RETRY_REQUEST, intent, flags)
      } else {
        PendingIntent.getService(context, RETRY_REQUEST, intent, flags)
      }
    }
  }
}
