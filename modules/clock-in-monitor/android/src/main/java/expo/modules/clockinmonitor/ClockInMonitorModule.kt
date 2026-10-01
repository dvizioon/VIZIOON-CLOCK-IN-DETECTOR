package expo.modules.clockinmonitor

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UsageAccessRequiredException :
  CodedException("Concede o acesso ao uso de apps para detectar o TOTVS Clock-in em primeiro plano.")

class ClockInMonitorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClockInMonitor")

    Events(
      "onForegroundAppChanged",
      "onCameraAvailabilityChanged",
      "onFacialRecognitionLikely",
    )

    OnCreate {
      instance = this@ClockInMonitorModule
    }

    OnDestroy {
      if (instance === this@ClockInMonitorModule) {
        instance = null
      }
    }

    Constant("totvsClockInPackage") {
      ClockInMonitorService.DEFAULT_PACKAGE
    }

    Function("hasUsageAccess") {
      appContext.reactContext?.hasUsageAccess() ?: false
    }

    Function("getStatus") {
      val context = appContext.reactContext
      mapOf(
        "monitoring" to ClockInMonitorService.running,
        "usageAccessGranted" to (context?.hasUsageAccess() ?: false),
        "targetPackage" to ClockInMonitorService.targetPackage,
        "foregroundPackage" to ClockInMonitorService.foregroundPackage,
        "clockInInForeground" to ClockInMonitorService.clockInInForeground,
        "cameraInUse" to ClockInMonitorService.camerasInUse.isNotEmpty(),
        "cameraIdsInUse" to ClockInMonitorService.camerasInUse.toList(),
      )
    }

    Function("getRecentEvents") {
      ClockInEventLog.recent()
    }

    AsyncFunction("openUsageAccessSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        appContext.reactContext?.startActivity(intent)
          ?: throw CodedException("Não foi possível abrir as configurações de acesso ao uso.")
      }
    }

    AsyncFunction("openNotificationSettings") {
      val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
        putExtra(Settings.EXTRA_APP_PACKAGE, appContext.reactContext?.packageName)
      }
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        appContext.reactContext?.startActivity(intent)
          ?: throw CodedException("Não foi possível abrir as notificações.")
      }
    }

    AsyncFunction("startMonitoring") { packageName: String? ->
      val context = appContext.reactContext
        ?: throw CodedException("O contexto Android ainda não está disponível.")
      if (!context.hasUsageAccess()) {
        throw UsageAccessRequiredException()
      }
      requestNotificationPermission()
      val target = packageName?.takeIf { it.isNotBlank() } ?: ClockInMonitorService.DEFAULT_PACKAGE
      val intent = Intent(context, ClockInMonitorService::class.java).apply {
        action = ClockInMonitorService.ACTION_START
        putExtra(ClockInMonitorService.EXTRA_PACKAGE, target)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      target
    }

    Function("listSystemSounds") { kind: String? ->
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, String>>()
      listNotificationSounds(context, kind == "alarm")
    }

    AsyncFunction("playSystemSound") { uri: String?, volume: Double?, kind: String? ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      playNotificationSound(context, uri ?: "", (volume ?: 1.0).toFloat(), kind == "alarm")
    }

    AsyncFunction("ensureAlertChannel") { channelId: String, soundUri: String?, vibrate: Boolean, times: Int, alarm: Boolean? ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      ensureAlertChannel(context, channelId, soundUri ?: "", vibrate, times, alarm == true)
      true
    }

    AsyncFunction("ensureFullScreenIntent") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      ensureFullScreenIntent(context)
    }

    AsyncFunction("canDrawOverlay") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      canDrawOverlay(context)
    }

    AsyncFunction("openOverlaySettings") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      openOverlaySettings(context)
      true
    }

    AsyncFunction("vibrateAlert") { times: Int? ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      vibrate(context, times ?: 4)
      true
    }

    AsyncFunction("cancelVibration") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      cancelVibration(context)
      true
    }

    AsyncFunction("rememberAlertPlayback") {
      soundUri: String?,
      alarmUri: String?,
      volume: Double?,
      notice: Boolean?,
      alarm: Boolean?,
      alarmSeconds: Int?,
      vibrate: Boolean?,
      vibrationCount: Int? ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      rememberAlertPlayback(
        context,
        soundUri ?: "",
        alarmUri ?: "",
        (volume ?: 1.0).toFloat(),
        notice != false,
        alarm == true,
        alarmSeconds ?: 5,
        vibrate != false,
        vibrationCount ?: 4,
      )
      true
    }

    AsyncFunction("presentScreenAlert") { title: String, message: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      presentScreenAlert(context, title, message)
      true
    }

    AsyncFunction("moveToBackground") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      activity.moveTaskToBack(true)
      true
    }

    AsyncFunction("scheduleScreenAlert") { at: Double, id: Int, title: String, message: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      scheduleScreenAlert(context, at.toLong(), id, title, message)
      true
    }

    AsyncFunction("cancelScreenAlert") { id: Int ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      cancelScreenAlert(context, id)
      true
    }

    AsyncFunction("setMonitorNotice") { visible: Boolean? ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      ClockInMonitorService.setMonitorNotice(context, visible != false)
      if (ClockInMonitorService.running) {
        val refresh = Intent(context, ClockInMonitorService::class.java).apply {
          action = ClockInMonitorService.ACTION_REFRESH
        }
        context.startService(refresh)
      }
      true
    }

    AsyncFunction("stopMonitoring") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      val intent = Intent(context, ClockInMonitorService::class.java).apply {
        action = ClockInMonitorService.ACTION_STOP
      }
      context.startService(intent)
      true
    }
  }

  private fun requestNotificationPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val activity = appContext.currentActivity ?: return
    if (activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
      return
    }
    activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_PERMISSION_REQUEST)
  }

  companion object {
    private const val NOTIFICATION_PERMISSION_REQUEST = 4101

    @Volatile
    var instance: ClockInMonitorModule? = null

    fun emit(name: String, payload: Map<String, Any?>) {
      instance?.sendEvent(name, payload)
    }
  }
}
