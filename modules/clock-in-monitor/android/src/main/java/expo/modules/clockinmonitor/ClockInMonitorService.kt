package expo.modules.clockinmonitor

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.camera2.CameraManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import java.util.concurrent.ConcurrentHashMap

class ClockInMonitorService : Service() {
  private lateinit var handlerThread: HandlerThread
  private lateinit var handler: Handler
  private var cameraCallbackRegistered = false
  private var foregroundStarted = false
  private var queryCursor = 0L
  private var facialSessionActive = false
  private var clockInSeenAt = 0L
  private var cameraBusyAt = 0L
  private var lastFacialAt = 0L

  private val cameraManager by lazy {
    getSystemService(Context.CAMERA_SERVICE) as CameraManager
  }

  private val usageStatsManager by lazy {
    getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
  }

  private val pollRunnable = object : Runnable {
    override fun run() {
      if (!running) return
      pollForegroundApp()
      if (running) {
        handler.postDelayed(this, POLL_INTERVAL_MS)
      }
    }
  }

  private val availabilityCallback = object : CameraManager.AvailabilityCallback() {
    override fun onCameraUnavailable(cameraId: String) {
      val wasBusy = camerasInUse.isNotEmpty()
      camerasInUse.add(cameraId)
      if (!wasBusy) {
        cameraBusyAt = System.currentTimeMillis()
      }
      publishCamera(cameraId, available = false)
      maybeEmitFacialRecognition(cameraId)
    }

    override fun onCameraAvailable(cameraId: String) {
      camerasInUse.remove(cameraId)
      publishCamera(cameraId, available = true)
      if (camerasInUse.isEmpty()) {
        facialSessionActive = false
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    handlerThread = HandlerThread("ClockInMonitor").also { it.start() }
    handler = Handler(handlerThread.looper)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      monitorEnabled(this, false)
      if (running || foregroundStarted) {
        shutdown()
      } else {
        stopSelf()
      }
      return START_NOT_STICKY
    }

    if (intent?.action == ACTION_REFRESH && (running || foregroundStarted)) {
      startAsForeground()
      return START_STICKY
    }

    val requested = intent?.getStringExtra(EXTRA_PACKAGE)?.takeIf { it.isNotBlank() }
    if (requested != null) {
      targetPackage = requested
    }
    monitorEnabled(this, true)

    startAsForeground()
    if (!running) {
      running = true
      queryCursor = System.currentTimeMillis() - INITIAL_LOOKBACK_MS
      registerCameraCallback()
      handler.post(pollRunnable)
    }
    return START_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    val restart = Intent(applicationContext, ClockInMonitorService::class.java).apply {
      action = ACTION_START
      putExtra(EXTRA_PACKAGE, targetPackage)
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        startForegroundService(restart)
      } else {
        startService(restart)
      }
    } catch (_: IllegalStateException) {
      // Android 12+ can reject a foreground start after the task is removed.
    }
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    running = false
    if (::handler.isInitialized) {
      handler.removeCallbacksAndMessages(null)
    }
    unregisterCameraCallback()
    camerasInUse.clear()
    if (::handlerThread.isInitialized) {
      handlerThread.quitSafely()
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startAsForeground() {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    foregroundStarted = true
  }

  private fun buildNotification(): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    val visible = monitorNoticeVisible(this)
    val channelId = if (visible) CHANNEL_ID else QUIET_CHANNEL_ID
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val importance = if (visible) NotificationManager.IMPORTANCE_LOW else NotificationManager.IMPORTANCE_MIN
      val channel = NotificationChannel(
        channelId,
        if (visible) "Monitor de ponto" else "Monitor de ponto oculto",
        importance,
      ).apply {
        description = "Avisa enquanto o detector observa o TOTVS Clock-in e a câmera."
        setShowBadge(visible)
      }
      manager.createNotificationChannel(channel)
    }

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, channelId)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }

    return builder
      .setSmallIcon(android.R.drawable.ic_menu_camera)
      .setContentTitle(if (visible) "Detector de ponto ativo" else "Detector de ponto")
      .setContentText(if (visible) "Observando o TOTVS Clock-in e o uso da câmera." else "Monitor ativo.")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setVisibility(if (visible) Notification.VISIBILITY_PUBLIC else Notification.VISIBILITY_SECRET)
      .build()
  }

  private fun registerCameraCallback() {
    if (cameraCallbackRegistered) return
    cameraManager.registerAvailabilityCallback(availabilityCallback, handler)
    cameraCallbackRegistered = true
  }

  private fun unregisterCameraCallback() {
    if (!cameraCallbackRegistered) return
    cameraManager.unregisterAvailabilityCallback(availabilityCallback)
    cameraCallbackRegistered = false
  }

  private fun pollForegroundApp() {
    if (!hasUsageAccess()) return
    val now = System.currentTimeMillis()
    val from = if (queryCursor == 0L) now - INITIAL_LOOKBACK_MS else now - QUERY_OVERLAP_MS
    queryCursor = now
    val events = try {
      usageStatsManager.queryEvents(from, now)
    } catch (_: SecurityException) {
      return
    } ?: return

    var latestPackage: String? = null
    var latestTimestamp = Long.MIN_VALUE
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val packageName = event.packageName ?: continue
      if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED && event.timeStamp >= latestTimestamp) {
        latestTimestamp = event.timeStamp
        latestPackage = packageName
      }
    }

    if (latestPackage == null) {
      val stats = try {
        usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_BEST, from, now)
      } catch (_: SecurityException) {
        null
      }
      val recent = stats
        ?.filter { now - it.lastTimeUsed <= QUERY_OVERLAP_MS }
        ?.maxByOrNull { it.lastTimeUsed }
      if (recent != null) {
        latestPackage = recent.packageName
        latestTimestamp = recent.lastTimeUsed
      }
    }

    val packageName = latestPackage ?: return
    val isClockIn = packageName == targetPackage
    if (isClockIn) {
      clockInSeenAt = now
    }
    if (packageName == foregroundPackage) {
      if (isClockIn) maybeEmitFacialRecognition(camerasInUse.firstOrNull() ?: "")
      return
    }

    foregroundPackage = packageName
    clockInInForeground = isClockIn
    ClockInEventLog.record(
      "onForegroundAppChanged",
      mapOf(
        "packageName" to packageName,
        "isClockIn" to isClockIn,
        "timestamp" to latestTimestamp,
      ),
    )
    maybeEmitFacialRecognition(camerasInUse.firstOrNull() ?: "")
  }

  private fun publishCamera(cameraId: String, available: Boolean) {
    ClockInEventLog.record(
      "onCameraAvailabilityChanged",
      mapOf(
        "cameraId" to cameraId,
        "available" to available,
        "inUse" to !available,
        "clockInInForeground" to clockInInForeground,
        "timestamp" to System.currentTimeMillis(),
      ),
    )
  }

  private fun maybeEmitFacialRecognition(cameraId: String) {
    val now = System.currentTimeMillis()
    if (cameraBusyAt == 0L || cameraBusyAt <= lastFacialAt) return
    if (now - cameraBusyAt > SIGNAL_WINDOW_MS) return
    val clockRecent = clockInInForeground || (clockInSeenAt > 0L && now - clockInSeenAt <= SIGNAL_WINDOW_MS)
    if (!clockRecent) return
    lastFacialAt = now
    facialSessionActive = camerasInUse.isNotEmpty()
    val id = cameraId.ifBlank { camerasInUse.firstOrNull() ?: "unknown" }
    ClockInEventLog.record(
      "onFacialRecognitionLikely",
      mapOf(
        "packageName" to targetPackage,
        "cameraId" to id,
        "timestamp" to now,
      ),
    )
  }

  private fun shutdown() {
    running = false
    if (::handler.isInitialized) {
      handler.removeCallbacksAndMessages(null)
    }
    unregisterCameraCallback()
    camerasInUse.clear()
    facialSessionActive = false
    clockInSeenAt = 0L
    cameraBusyAt = 0L
    lastFacialAt = 0L
    clockInInForeground = false
    foregroundPackage = null
    if (foregroundStarted) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      foregroundStarted = false
    }
    stopSelf()
  }

  companion object {
    const val ACTION_START = "expo.modules.clockinmonitor.action.START"
    const val ACTION_STOP = "expo.modules.clockinmonitor.action.STOP"
    const val ACTION_REFRESH = "expo.modules.clockinmonitor.action.REFRESH"
    const val EXTRA_PACKAGE = "packageName"
    const val DEFAULT_PACKAGE = "com.clockinfieldtools"

    private const val PREFS = "ponto-monitor"
    private const val CHANNEL_ID = "clock_in_monitor"
    private const val QUIET_CHANNEL_ID = "clock_in_monitor_quiet"
    private const val NOTIFICATION_ID = 4101
    private const val POLL_INTERVAL_MS = 1_000L
    private const val INITIAL_LOOKBACK_MS = 2 * 60 * 60 * 1000L
    private const val QUERY_OVERLAP_MS = 2 * 60 * 1000L
    private const val SIGNAL_WINDOW_MS = 90 * 1000L

    fun monitorEnabled(context: Context, enabled: Boolean) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putBoolean("enabled", enabled)
        .putString("package", targetPackage)
        .apply()
    }

    fun monitorNoticeVisible(context: Context): Boolean {
      return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("notice", true)
    }

    fun setMonitorNotice(context: Context, visible: Boolean) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("notice", visible).apply()
    }

    fun storedPackage(context: Context): String {
      return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString("package", DEFAULT_PACKAGE)
        ?.takeIf { it.isNotBlank() }
        ?: DEFAULT_PACKAGE
    }

    fun shouldRestart(context: Context): Boolean {
      return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("enabled", false)
    }

    @Volatile var running: Boolean = false
    @Volatile var targetPackage: String = DEFAULT_PACKAGE
    @Volatile var foregroundPackage: String? = null
    @Volatile var clockInInForeground: Boolean = false

    val camerasInUse: MutableSet<String> = ConcurrentHashMap.newKeySet()
  }
}
