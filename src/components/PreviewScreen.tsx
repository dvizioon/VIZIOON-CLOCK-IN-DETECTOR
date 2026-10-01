import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { startBackgroundPreview, stopPreview } from '../schedule/alerts';
import { ensureOverlayPermission } from 'clock-in-monitor';
import { formatClock, scheduledTimes } from '../schedule/time';
import { punchTitle, type PunchKind, type ScheduleSettings } from '../schedule/types';

const KINDS: PunchKind[] = ['entry', 'lunchOut', 'lunchIn', 'exit'];
const ALERT_STEP: Partial<Record<PunchKind, number>> = {
  lunchIn: 1,
  exit: 2,
};

type Props = {
  settings: ScheduleSettings;
  onPreviewSeconds: (seconds: number) => void;
};

export function PreviewScreen({ settings, onPreviewSeconds }: Props) {
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const entryAt = useMemo(() => {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.getTime();
  }, [hour, minute]);
  const times = scheduledTimes(entryAt, settings);
  const gap = settings.previewSeconds || 10;
  const elapsed = startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));

  useEffect(() => () => stopPreview(), []);

  useEffect(() => {
    if (startedAt == null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      appState.remove();
    };
  }, [startedAt]);

  function start() {
    const run = () => {
      const began = Date.now();
      setStartedAt(began);
      setNow(began);
      void startBackgroundPreview(settings);
    };
    if (!settings.screenAlert) {
      run();
      return;
    }
    void ensureOverlayPermission().then((allowed) => {
      if (!allowed) return;
      run();
    });
  }

  function stop() {
    stopPreview();
    setStartedAt(null);
  }

  function mark(kind: PunchKind): string {
    const step = ALERT_STEP[kind];
    if (step == null) return 'sem aviso';
    if (startedAt == null) return formatClock(times[kind]);
    const due = step * gap;
    if (elapsed >= due) return 'avisou';
    return `em ${due - elapsed}s`;
  }

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Prévia</Text>
      <Text style={styles.body}>
        {startedAt == null
          ? settings.screenAlert
            ? 'Bater ponto manda o aplicativo para o fundo. O aviso da volta e da saída aparece por cima do que estiver aberto.'
            : 'Bater ponto manda o aplicativo para o fundo. A volta e a saída avisam por notificação. A janela no meio da tela está desligada.'
          : `Passaram ${elapsed}s. A volta avisa em ${gap}s e a saída em ${gap * 2}s.`}
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Hora</Text>
        <View style={styles.controls}>
          <Step onPress={() => setHour((value) => (value + 23) % 24)} label="−" />
          <Text style={styles.value}>{String(hour).padStart(2, '0')}</Text>
          <Step onPress={() => setHour((value) => (value + 1) % 24)} label="+" />
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Minuto</Text>
        <View style={styles.controls}>
          <Step onPress={() => setMinute((value) => (value + 59) % 60)} label="−" />
          <Text style={styles.value}>{String(minute).padStart(2, '0')}</Text>
          <Step onPress={() => setMinute((value) => (value + 1) % 60)} label="+" />
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Intervalo</Text>
        <View style={styles.controls}>
          <Step onPress={() => onPreviewSeconds(Math.max(5, settings.previewSeconds - 1))} label="−" />
          <Text style={styles.value}>{settings.previewSeconds}s</Text>
          <Step onPress={() => onPreviewSeconds(Math.min(60, settings.previewSeconds + 1))} label="+" />
        </View>
      </View>

      <View style={styles.finder}>
        <View style={styles.lens} />
        <Text style={styles.finderText}>
          {startedAt == null ? 'Câmera' : `${elapsed}s`}
        </Text>
      </View>

      {KINDS.map((kind) => {
        const status = mark(kind);
        const passed = startedAt != null && status === 'avisou';
        return (
          <Text key={kind} style={[styles.punch, passed ? styles.punchDone : null, status.startsWith('em ') ? styles.punchActive : null]}>
            {punchTitle[kind]} · {status}
          </Text>
        );
      })}

      {startedAt == null ? (
        <Pressable style={styles.shutter} onPress={start}>
          <Text style={styles.shutterLabel}>Bater ponto</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.stop} onPress={stop}>
          <Text style={styles.stopLabel}>Parar</Text>
        </Pressable>
      )}
    </View>
  );
}

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.step} onPress={onPress}>
      <Text style={styles.stepLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  back: {
    color: '#2A1B4E',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#102033',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3d4d60',
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#102033',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  value: {
    width: 36,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#102033',
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e7eef8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 22,
    color: '#2A1B4E',
    fontWeight: '600',
  },
  finder: {
    height: 180,
    borderRadius: 20,
    backgroundColor: '#102033',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  lens: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
  },
  finderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  punch: {
    fontSize: 15,
    color: '#3d4d60',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  punchActive: {
    color: '#102033',
    fontWeight: '700',
  },
  punchDone: {
    color: '#5E4B8B',
  },
  notice: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  noticeLabel: {
    fontSize: 12,
    color: '#6b7c90',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#102033',
  },
  noticeBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3d4d60',
  },
  shutter: {
    backgroundColor: '#2A1B4E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shutterLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stop: {
    backgroundColor: '#e7eef8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopLabel: {
    color: '#2A1B4E',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: '#2A1B4E',
    paddingTop: 72,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  overlayKicker: {
    color: '#D8D2FC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  overlayMessage: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
  },
  overlaySpacer: {
    flex: 1,
  },
  overlayOk: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  overlayOkLabel: {
    color: '#2A1B4E',
    fontSize: 18,
    fontWeight: '700',
  },
});
