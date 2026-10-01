package expo.modules.clockinmonitor

internal object ClockInEventLog {
  private const val MAX_EVENTS = 50
  private val events = ArrayDeque<Map<String, Any?>>()

  fun record(type: String, payload: Map<String, Any?>) {
    val entry = mapOf("type" to type) + payload
    synchronized(events) {
      events.addLast(entry)
      while (events.size > MAX_EVENTS) {
        events.removeFirst()
      }
    }
    ClockInMonitorModule.emit(type, payload)
  }

  fun recent(): List<Map<String, Any?>> = synchronized(events) { events.toList() }

  fun clear() {
    synchronized(events) { events.clear() }
  }
}
