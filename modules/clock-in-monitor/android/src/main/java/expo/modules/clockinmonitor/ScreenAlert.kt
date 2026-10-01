package expo.modules.clockinmonitor

import android.app.Activity
import android.app.AlarmManager
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

const val SCREEN_ALERT_TITLE = "title"
const val SCREEN_ALERT_MESSAGE = "message"
const val SCREEN_ALERT_ID = "id"

private const val ALERT_PREFS = "ponto-alert"
private val alertHandler = Handler(Looper.getMainLooper())
private var overlayView: android.view.View? = null
private var alertToken = 0

fun canDrawOverlay(context: Context): Boolean {
  return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
}

fun openOverlaySettings(context: Context) {
  val settings = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }
  context.startActivity(settings)
}

fun rememberAlertPlayback(
  context: Context,
  soundUri: String,
  alarmUri: String,
  volume: Float,
  notice: Boolean,
  alarm: Boolean,
  alarmSeconds: Int,
  vibrate: Boolean,
  vibrationCount: Int,
) {
  context.getSharedPreferences(ALERT_PREFS, Context.MODE_PRIVATE).edit()
    .putString("sound", soundUri)
    .putString("alarm", alarmUri)
    .putFloat("volume", volume)
    .putBoolean("notice", notice)
    .putBoolean("alarmOn", alarm)
    .putInt("alarmSeconds", alarmSeconds)
    .putBoolean("vibrate", vibrate)
    .putInt("vibrationCount", vibrationCount)
    .apply()
}

fun presentScreenAlert(context: Context, title: String, message: String) {
  if (!canDrawOverlay(context)) {
    openOverlaySettings(context)
    return
  }
  showSystemOverlay(context, title, message)
}

private fun showSystemOverlay(context: Context, title: String, message: String) {
  val app = context.applicationContext
  if (!canDrawOverlay(app)) return
  alertToken += 1
  val windowManager = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  alertHandler.post {
    removeOverlayView(windowManager)
    val density = app.resources.displayMetrics.density
    fun dp(value: Int) = (value * density).toInt()
    val card = LinearLayout(app).apply {
      orientation = LinearLayout.VERTICAL
      background = GradientDrawable().apply {
        setColor(Color.WHITE)
        cornerRadius = dp(20).toFloat()
      }
      setPadding(dp(22), dp(22), dp(22), dp(16))
      elevation = dp(8).toFloat()
      gravity = Gravity.CENTER_HORIZONTAL
    }
    card.addView(logoView(app, dp(72)))
    card.addView(TextView(app).apply {
      text = title
      setTextColor(Color.parseColor("#2A1B4E"))
      textSize = 16f
      setTypeface(typeface, Typeface.BOLD)
    })
    card.addView(TextView(app).apply {
      text = message
      setTextColor(Color.parseColor("#102033"))
      textSize = 22f
      setTypeface(typeface, Typeface.BOLD)
      setPadding(0, dp(10), 0, dp(18))
    })
    card.addView(TextView(app).apply {
      text = "OK"
      setTextColor(Color.WHITE)
      textSize = 16f
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#2A1B4E"))
      setPadding(dp(16), dp(14), dp(16), dp(14))
      setOnClickListener {
        alertToken += 1
        removeOverlayView(windowManager)
        playNotificationSound(app, "", 0f, false)
      }
    })
    val root = FrameLayout(app).apply {
      setBackgroundColor(0x99000000.toInt())
      addView(card, FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
      ).apply {
        gravity = Gravity.CENTER
        leftMargin = dp(28)
        rightMargin = dp(28)
      })
    }
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      type,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      PixelFormat.TRANSLUCENT,
    )
    params.gravity = Gravity.CENTER
    windowManager.addView(root, params)
    overlayView = root
  }
  wakeScreen(app)
}

private fun removeOverlayView(windowManager: WindowManager) {
  val view = overlayView ?: return
  overlayView = null
  runCatching { windowManager.removeView(view) }
}

fun ensureFullScreenIntent(context: Context): Boolean {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
  val notifications = context.getSystemService(NotificationManager::class.java) ?: return true
  if (notifications.canUseFullScreenIntent()) return true
  val settings = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
    data = Uri.parse("package:${context.packageName}")
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }
  context.startActivity(settings)
  return false
}

fun scheduleScreenAlert(context: Context, at: Long, id: Int, title: String, message: String) {
  val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  val pending = screenAlertPending(context, id, title, message)
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
  } else {
    manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
  }
  rememberScreenAlert(context, at, id, title, message)
}

fun cancelScreenAlert(context: Context, id: Int) {
  val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  manager.cancel(screenAlertPending(context, id, "", ""))
  context.getSystemService(NotificationManager::class.java)?.cancel(id)
  forgetScreenAlert(context, id)
  val windowManager = context.applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  alertToken += 1
  alertHandler.post { removeOverlayView(windowManager) }
  playNotificationSound(context, "", 0f, false)
}

private const val ALARM_PREFS = "ponto-alarms"

private fun rememberScreenAlert(context: Context, at: Long, id: Int, title: String, message: String) {
  val prefs = context.getSharedPreferences(ALARM_PREFS, Context.MODE_PRIVATE)
  val next = (prefs.getStringSet("items", emptySet()) ?: emptySet()).toMutableSet()
  next.removeAll { it.substringBefore('\u001f') == id.toString() }
  next.add(listOf(id.toString(), at.toString(), title, message).joinToString("\u001f"))
  prefs.edit().putStringSet("items", next).apply()
}

private fun forgetScreenAlert(context: Context, id: Int) {
  val prefs = context.getSharedPreferences(ALARM_PREFS, Context.MODE_PRIVATE)
  val next = (prefs.getStringSet("items", emptySet()) ?: emptySet()).toMutableSet()
  next.removeAll { it.substringBefore('\u001f') == id.toString() }
  prefs.edit().putStringSet("items", next).apply()
}

fun restoreScreenAlerts(context: Context) {
  val prefs = context.getSharedPreferences(ALARM_PREFS, Context.MODE_PRIVATE)
  val items = prefs.getStringSet("items", emptySet()) ?: emptySet()
  val now = System.currentTimeMillis()
  items.forEach { raw ->
    val parts = raw.split('\u001f', limit = 4)
    if (parts.size < 4) return@forEach
    val id = parts[0].toIntOrNull() ?: return@forEach
    val at = parts[1].toLongOrNull() ?: return@forEach
    if (at <= now) {
      forgetScreenAlert(context, id)
      return@forEach
    }
    scheduleScreenAlert(context, at, id, parts[2], parts[3])
  }
}

private fun screenAlertIntent(context: Context, id: Int, title: String, message: String): Intent {
  return Intent(context, PunchAlertActivity::class.java).apply {
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    putExtra(SCREEN_ALERT_TITLE, title)
    putExtra(SCREEN_ALERT_MESSAGE, message)
    putExtra(SCREEN_ALERT_ID, id)
  }
}

private fun screenAlertPending(context: Context, id: Int, title: String, message: String): PendingIntent {
  val intent = Intent(context, ScreenAlertReceiver::class.java).apply {
    putExtra(SCREEN_ALERT_TITLE, title)
    putExtra(SCREEN_ALERT_MESSAGE, message)
    putExtra(SCREEN_ALERT_ID, id)
  }
  return PendingIntent.getBroadcast(
    context,
    id,
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )
}

class ScreenAlertReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val title = intent.getStringExtra(SCREEN_ALERT_TITLE) ?: "Ponto"
    val message = intent.getStringExtra(SCREEN_ALERT_MESSAGE) ?: "Hora de bater o ponto."
    val id = intent.getIntExtra(SCREEN_ALERT_ID, 0)
    val launch = screenAlertIntent(context, id, title, message)
    val fullScreen = PendingIntent.getActivity(
      context,
      id,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val notifications = context.getSystemService(NotificationManager::class.java)
    if (notifications != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel("ponto-tela", "Alerta na tela", NotificationManager.IMPORTANCE_HIGH)
      channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      channel.setSound(null, null)
      channel.enableVibration(false)
      notifications.createNotificationChannel(channel)
    val locked = (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked
    val notification = Notification.Builder(context, "ponto-tela")
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setContentTitle(title)
      .setContentText(message)
      .setCategory(Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setContentIntent(fullScreen)
      .apply {
        if (locked) setFullScreenIntent(fullScreen, true)
      }
      .build()
    notifications.notify(id, notification)
    if (locked) runCatching { context.startActivity(launch) }
    }
    try {
      showSystemOverlay(context, title, message)
    } catch (_: Exception) {
      runCatching { context.startActivity(launch) }
    }
    playSavedAlert(context)
  }
}

private fun wakeScreen(context: Context) {
  val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
  @Suppress("DEPRECATION")
  val lock = power.newWakeLock(
    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
    "clockin:overlay",
  )
  lock.acquire(8_000)
}

private fun playSavedAlert(context: Context) {
  val prefs = context.getSharedPreferences(ALERT_PREFS, Context.MODE_PRIVATE)
  val volume = prefs.getFloat("volume", 1f)
  val token = alertToken
  if (prefs.getBoolean("vibrate", true)) {
    vibrate(context, prefs.getInt("vibrationCount", 4))
  }
  val notice = prefs.getBoolean("notice", true)
  if (notice) {
    playNotificationSound(context, prefs.getString("sound", "") ?: "", volume, false)
  }
  if (!prefs.getBoolean("alarmOn", false)) return
  val wait = if (notice) 3200L else 0L
  val alarmSeconds = prefs.getInt("alarmSeconds", 5).coerceIn(1, 30)
  alertHandler.postDelayed({
    if (token != alertToken) return@postDelayed
    playNotificationSound(context, prefs.getString("alarm", "") ?: "", volume, true)
  }, wait)
  alertHandler.postDelayed({
    if (token != alertToken) return@postDelayed
    playNotificationSound(context, "", 0f, true)
  }, wait + alarmSeconds * 1000L)
}

private fun logoView(context: Context, size: Int): ImageView {
  return ImageView(context).apply {
    setImageResource(R.drawable.alert_logo)
    layoutParams = LinearLayout.LayoutParams(size, size).apply {
      gravity = Gravity.CENTER_HORIZONTAL
      bottomMargin = size / 5
    }
  }
}

private fun vibrate(context: Context, times: Int) {
  val count = times.coerceIn(1, 10)
  val pattern = LongArray(count * 2) { index -> if (index % 2 == 0) { if (index == 0) 0L else 200L } else 400L }
  val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    context.getSystemService(VibratorManager::class.java).defaultVibrator
  } else {
    @Suppress("DEPRECATION")
    context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
  }
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
  } else {
    @Suppress("DEPRECATION")
    vibrator.vibrate(pattern, -1)
  }
}

class PunchAlertActivity : Activity() {
  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
    )
    showAlert()
  }

  @Deprecated("O alerta só fecha no OK.")
  override fun onBackPressed() {
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    showAlert()
  }

  private fun showAlert() {
    val title = intent.getStringExtra(SCREEN_ALERT_TITLE) ?: "Ponto"
    val message = intent.getStringExtra(SCREEN_ALERT_MESSAGE) ?: "Hora de bater o ponto."
    val id = intent.getIntExtra(SCREEN_ALERT_ID, 0)
    val density = resources.displayMetrics.density
    fun dp(value: Int) = (value * density).toInt()

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.parseColor("#2A1B4E"))
      setPadding(dp(28), dp(48), dp(28), dp(28))
      gravity = Gravity.CENTER_HORIZONTAL
    }
    root.addView(logoView(this, dp(88)))
    root.addView(TextView(this).apply {
      text = title
      setTextColor(Color.parseColor("#D8D2FC"))
      textSize = 16f
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
    })
    root.addView(TextView(this).apply {
      text = message
      setTextColor(Color.WHITE)
      textSize = 28f
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
      setPadding(0, dp(24), 0, 0)
    })
    val spacer = android.view.View(this).apply {
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f)
    }
    root.addView(spacer)
    root.addView(TextView(this).apply {
      text = "OK"
      setTextColor(Color.parseColor("#2A1B4E"))
      textSize = 18f
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
      setBackgroundColor(Color.WHITE)
      setPadding(dp(24), dp(18), dp(24), dp(18))
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
      setOnClickListener {
        getSystemService(NotificationManager::class.java)?.cancel(id)
        finish()
      }
    })
    setContentView(FrameLayout(this).apply {
      setBackgroundColor(Color.parseColor("#2A1B4E"))
      addView(root, FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT,
      ))
    })
  }
}
