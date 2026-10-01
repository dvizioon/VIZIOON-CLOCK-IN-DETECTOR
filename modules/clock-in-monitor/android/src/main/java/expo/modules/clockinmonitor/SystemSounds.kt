package expo.modules.clockinmonitor

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings

private var player: MediaPlayer? = null

fun listNotificationSounds(context: Context, alarm: Boolean): List<Map<String, String>> {
  val label = if (alarm) "Alarme do Android" else "Padrão do Android"
  val sounds = mutableListOf(mapOf("title" to label, "uri" to ""))
  val manager = RingtoneManager(context)
  manager.setType(if (alarm) RingtoneManager.TYPE_ALARM else RingtoneManager.TYPE_NOTIFICATION)
  val cursor = manager.cursor ?: return sounds
  val seen = mutableSetOf<String>()
  while (cursor.moveToNext()) {
    val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX) ?: continue
    val uri = manager.getRingtoneUri(cursor.position)?.toString() ?: continue
    if (!seen.add(uri)) continue
    sounds.add(mapOf("title" to title, "uri" to uri))
  }
  return sounds
}

fun playNotificationSound(context: Context, uriString: String, volume: Float, alarm: Boolean): Boolean {
  player?.release()
  player = null
  val level = volume.coerceIn(0f, 1f)
  if (level == 0f) return true
  val uri = when {
    uriString.isNotBlank() -> Uri.parse(uriString)
    alarm -> Settings.System.DEFAULT_ALARM_ALERT_URI
    else -> Settings.System.DEFAULT_NOTIFICATION_URI
  } ?: return false
  val media = MediaPlayer()
  return try {
    media.setAudioAttributes(
      AudioAttributes.Builder()
        .setUsage(if (alarm) AudioAttributes.USAGE_ALARM else AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build(),
    )
    media.setDataSource(context, uri)
    media.setVolume(level, level)
    media.isLooping = false
    media.setOnCompletionListener {
      it.release()
      if (player === it) player = null
    }
    media.prepare()
    media.start()
    player = media
    true
  } catch (_: Exception) {
    media.release()
    player = null
    false
  }
}

fun ensureAlertChannel(
  context: Context,
  channelId: String,
  soundUri: String,
  vibrate: Boolean,
  times: Int,
  alarm: Boolean,
) {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
  val manager = context.getSystemService(NotificationManager::class.java) ?: return
  val channel = NotificationChannel(
    channelId,
    if (alarm) "Alarme de ponto" else "Alertas de ponto",
    NotificationManager.IMPORTANCE_HIGH,
  )
  if (soundUri == "off") {
    channel.setSound(null, null)
  } else {
    val uri = when {
      soundUri.isNotBlank() -> Uri.parse(soundUri)
      alarm -> Settings.System.DEFAULT_ALARM_ALERT_URI
      else -> Settings.System.DEFAULT_NOTIFICATION_URI
    }
    if (uri != null) {
      val attributes = AudioAttributes.Builder()
        .setUsage(if (alarm) AudioAttributes.USAGE_ALARM else AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      channel.setSound(uri, attributes)
    }
  }
  val pulses = if (vibrate) times.coerceIn(1, 10) else 0
  channel.enableVibration(pulses > 0)
  channel.vibrationPattern = alertVibrationPattern(pulses)
  manager.createNotificationChannel(channel)
}

fun alertVibrationPattern(times: Int): LongArray {
  if (times <= 0) return longArrayOf(0)
  val count = times.coerceIn(1, 10)
  val pattern = LongArray(count * 2)
  for (index in 0 until count) {
    pattern[index * 2] = if (index == 0) 0L else 200L
    pattern[index * 2 + 1] = 400L
  }
  return pattern
}
