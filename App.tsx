import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TOTVS_CLOCK_IN_PACKAGE,
  isNativeMonitorAvailable,
  addCameraAvailabilityListener,
  addFacialRecognitionListener,
  addForegroundAppListener,
  getRecentEvents,
  getStatus,
  openUsageAccessSettings,
  setMonitorNotice,
  startMonitoring,
  stopMonitoring,
  type MonitorStatus,
} from 'clock-in-monitor';
import { AboutScreen } from './src/components/AboutScreen';
import { Bars } from './src/components/Bars';
import { LogsScreen } from './src/components/LogsScreen';
import { PreviewScreen } from './src/components/PreviewScreen';
import { PunchesScreen } from './src/components/PunchesScreen';
import { SettingsScreen } from './src/components/SettingsScreen';
import { downloadLogs, rememberEvents, type LogLine } from './src/logs/logbook';
import { listenForStopAction, openNotificationSettings, readNotificationPermission, requestNotificationPermission } from './src/schedule/alerts';
import { countsByDay, countsByKind, monthKey, monthTitle, punchedCount, startOfWeek, weekKeys } from './src/schedule/history';
import { loadSettings, registerFacialRecognition, savePunchNote, saveSettings, syncTodayFromEvents } from './src/schedule/day';
import { readDays, writeSettings } from './src/schedule/storage';
import type { ScheduleSettings, WorkDay } from './src/schedule/types';
import { defaultSettings } from './src/schedule/types';

const logo = require('./assets/icon.png');

function readableError(caught: unknown, fallback: string): string {
  const raw = caught instanceof Error ? caught.message : '';
  if (raw.toLowerCase().includes('acesso ao uso')) {
    return 'Libera o acesso ao uso para detectar o ponto.';
  }
  return fallback;
}

function chartFrom(days: WorkDay[]) {
  const now = Date.now();
  const prefix = monthKey(now);
  return {
    title: monthTitle(now),
    count: punchedCount(days, prefix),
    week: countsByDay(days, weekKeys(startOfWeek(now))),
    kinds: countsByKind(days, prefix),
  };
}

const emptyStatus: MonitorStatus = {
  monitoring: false,
  usageAccessGranted: false,
  targetPackage: TOTVS_CLOCK_IN_PACKAGE,
  foregroundPackage: null,
  clockInInForeground: false,
  cameraInUse: false,
  cameraIdsInUse: [],
};

function App() {
  const [status, setStatus] = useState<MonitorStatus>(() =>
    Platform.OS === 'android' ? getStatus() : emptyStatus,
  );
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<'home' | 'settings' | 'about' | 'logs' | 'preview' | 'punches'>('home');
  const [settings, setSettings] = useState<ScheduleSettings>(defaultSettings);
  const [alertWarning, setAlertWarning] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [savingLogs, setSavingLogs] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);
  const [days, setDays] = useState<WorkDay[]>([]);
  const [chart, setChart] = useState(() => chartFrom([]));

  const showDays = useCallback((next: WorkDay[]) => {
    setDays(next);
    setChart(chartFrom(next));
  }, []);

  useEffect(() => {
    if (!savedToast) return;
    const timer = setTimeout(() => setSavedToast(false), 2200);
    return () => clearTimeout(timer);
  }, [savedToast]);

  const refreshPermissions = useCallback(() => {
    void readNotificationPermission().then(setNotificationsGranted);
  }, []);

  const refresh = useCallback(() => {
    if (Platform.OS !== 'android') return;
    setStatus(getStatus());
    void rememberEvents(getRecentEvents()).then(setLogs);
    void readDays().then(showDays);
  }, [showDays]);

  const applyScheduleResult = useCallback((result: { alertWarning: string | null }) => {
    setAlertWarning(result.alertWarning);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void loadSettings().then((next) => {
      setSettings(next);
      void setMonitorNotice(next.showMonitorNotice !== false);
    });
    void readDays().then(showDays);
    void syncTodayFromEvents(getRecentEvents()).then(applyScheduleResult);
    void requestNotificationPermission().then((result) => {
      if (result === 'settings') {
        setNotificationsGranted(false);
        return;
      }
      setNotificationsGranted(result === 'granted');
    });
    const stopListening = listenForStopAction();
    const foreground = addForegroundAppListener(() => refresh());
    const camera = addCameraAvailabilityListener(() => refresh());
    const facial = addFacialRecognitionListener((event) => {
      refresh();
      void registerFacialRecognition(event.timestamp).then((result) => {
        applyScheduleResult(result);
        void readDays().then(showDays);
      });
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      refresh();
      refreshPermissions();
      void syncTodayFromEvents(getRecentEvents()).then(applyScheduleResult);
    });
    return () => {
      stopListening();
      foreground.remove();
      camera.remove();
      facial.remove();
      appState.remove();
    };
  }, [applyScheduleResult, refresh, refreshPermissions]);

  async function onStart() {
    setBusy(true);
    setError(null);
    try {
      await startMonitoring();
      refresh();
    } catch (caught) {
      setError(readableError(caught, 'Não foi possível iniciar o monitor.'));
    } finally {
      setBusy(false);
    }
  }

  async function onStop() {
    setBusy(true);
    setError(null);
    try {
      await stopMonitoring();
      refresh();
    } catch (caught) {
      setError(readableError(caught, 'Não foi possível parar o monitor.'));
    } finally {
      setBusy(false);
    }
  }

  if (Platform.OS !== 'android' || !isNativeMonitorAvailable()) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Detector de ponto</Text>
          <Text style={styles.body}>
            {Platform.OS !== 'android'
              ? 'Este app funciona apenas no Android.'
              : 'Instale o app no celular para usar o monitor.'}
          </Text>
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  const showTabs = true;

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        {screen === 'preview' ? (
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <PreviewScreen
              settings={settings}
              onPreviewSeconds={(previewSeconds) => {
                const next = { ...settings, previewSeconds };
                setSettings(next);
                void writeSettings(next);
              }}
            />
          </ScrollView>
        ) : null}

        {screen === 'punches' ? (
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <PunchesScreen
              days={days}
              onNote={(dayKey, target, note) => {
                void savePunchNote(dayKey, target, note).then(() => readDays().then(showDays));
              }}
            />
          </ScrollView>
        ) : null}

        {screen === 'logs' ? (
          <LogsScreen
            lines={logs}
            message={logMessage}
            saving={savingLogs}
            onDownload={() => {
              setSavingLogs(true);
              setLogMessage(null);
              void downloadLogs(logs)
                .then(setLogMessage)
                .finally(() => setSavingLogs(false));
            }}
          />
        ) : null}

        {screen === 'about' ? (
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <AboutScreen />
          </ScrollView>
        ) : null}

        {screen === 'settings' ? (
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <SettingsScreen
              settings={settings}
              notificationsGranted={notificationsGranted}
              onOpenNotifications={() => {
                void readNotificationPermission().then((alreadyGranted) => {
                  if (alreadyGranted) {
                    setNotificationsGranted(true);
                    void openNotificationSettings();
                    return;
                  }
                  void requestNotificationPermission().then((result) => {
                    setNotificationsGranted(result === 'granted');
                    if (result !== 'granted') void openNotificationSettings();
                  });
                });
              }}
              onSave={(next) => {
                void setMonitorNotice(next.showMonitorNotice !== false);
                void saveSettings(next).then((result) => {
                  setSettings(next);
                  applyScheduleResult(result);
                  setSavedToast(true);
                });
              }}
            />
          </ScrollView>
        ) : null}

        {screen === 'home' ? (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.homeHead}>
          <View style={styles.homeLogoFrame}>
            <Image source={logo} style={styles.homeLogo} resizeMode="cover" />
          </View>
          <View style={styles.homeCopy}>
            <Text style={styles.title}>Detector de ponto</Text>
            <Text style={styles.body}>Monitora o ponto e avisa na hora das próximas batidas.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Row icon="key-outline" label="Acesso ao uso" value={status.usageAccessGranted ? 'concedido' : 'pendente'} />
          {!status.usageAccessGranted ? (
            <Text style={styles.error}>Conceda o acesso ao uso para detectar o ponto.</Text>
          ) : null}
          <Row icon="pulse-outline" label="Monitor" value={status.monitoring ? 'ativo' : 'parado'} />
          <Row icon="phone-portrait-outline" label="Ponto" value={status.clockInInForeground ? 'visível' : 'não'} />
          <Row icon="camera-outline" label="Câmera" value={status.cameraInUse ? 'em uso' : 'livre'} />
        </View>

        <View style={styles.card}>
          <View style={styles.monthHead}>
            <Ionicons name="stats-chart-outline" size={20} color="#2A1B4E" />
            <Text style={styles.monthTitle}>{chart.title}</Text>
            <Text style={styles.monthCount}>{chart.count}</Text>
          </View>
          <View style={styles.chartLabel}>
            <Ionicons name="calendar-outline" size={16} color="#2A1B4E" />
            <Text style={styles.chartText}>Semana</Text>
          </View>
          <Bars items={chart.week} />
          <View style={styles.chartLabel}>
            <Ionicons name="pie-chart-outline" size={16} color="#2A1B4E" />
            <Text style={styles.chartText}>No mês</Text>
          </View>
          <Bars items={chart.kinds} />
        </View>

        {alertWarning ? <Text style={styles.error}>{alertWarning}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            openUsageAccessSettings().catch((caught: unknown) => {
              setError('Não foi possível abrir as configurações.');
            });
          }}
        >
          <Text style={styles.secondaryLabel}>Abrir acesso ao uso</Text>
        </Pressable>

        {status.monitoring ? (
          <Pressable style={styles.button} disabled={busy} onPress={onStop}>
            <Text style={styles.buttonLabel}>{busy ? 'Parando…' : 'Parar monitor'}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.button} disabled={busy} onPress={onStart}>
            <Text style={styles.buttonLabel}>{busy ? 'Iniciando…' : 'Iniciar monitor'}</Text>
          </Pressable>
        )}
      </ScrollView>
        ) : null}
      </View>
      {showTabs ? <BottomNav screen={screen} onChange={setScreen} /> : null}
      {savedToast ? <SavedToast /> : null}
      <StatusBar style="auto" />
    </View>
  );
}

export default function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

const tabs = [
  { id: 'home', label: 'Início', icon: 'home', iconOff: 'home-outline' },
  { id: 'punches', label: 'Batidas', icon: 'calendar', iconOff: 'calendar-outline' },
  { id: 'preview', label: 'Prévia', icon: 'play-circle', iconOff: 'play-circle-outline' },
  { id: 'logs', label: 'Logs', icon: 'document-text', iconOff: 'document-text-outline' },
  { id: 'settings', label: 'Ajustes', icon: 'settings', iconOff: 'settings-outline' },
  { id: 'about', label: 'Sobre', icon: 'information-circle', iconOff: 'information-circle-outline' },
] as const;

function SavedToast() {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.toastWrap, { bottom: Math.max(insets.bottom, 8) + 72 }]}>
      <View style={styles.toast}>
        <Ionicons name="checkmark-circle" size={20} color="#D8D2FC" />
        <Text style={styles.toastText}>Configurações salvas</Text>
      </View>
    </View>
  );
}

function BottomNav({
  screen,
  onChange,
}: {
  screen: (typeof tabs)[number]['id'];
  onChange: (screen: (typeof tabs)[number]['id']) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const selected = screen === tab.id;
        return (
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)} accessibilityLabel={tab.label}>
            <Ionicons name={selected ? tab.icon : tab.iconOff} size={22} color={selected ? '#2A1B4E' : '#6b7c90'} />
            <Text style={selected ? styles.tabLabelOn : styles.tabLabel}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: 'key-outline' | 'pulse-outline' | 'phone-portrait-outline' | 'camera-outline';
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color="#2A1B4E" />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  toastWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2A1B4E',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  main: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d7e3f2',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: '#6b7c90',
  },
  tabLabelOn: {
    fontSize: 11,
    color: '#2A1B4E',
    fontWeight: '700',
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  settingsContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  homeLogoFrame: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#2A1B4E',
  },
  homeLogo: {
    width: 72,
    height: 72,
  },
  homeCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#102033',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3d4d60',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 12,
    color: '#6b7c90',
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 16,
    color: '#102033',
  },
  monthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#102033',
  },
  monthCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2A1B4E',
  },
  chartLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  chartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3d4d60',
  },
  error: {
    color: '#9b2331',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#2A1B4E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#e7eef8',
  },
  secondaryLabel: {
    color: '#2A1B4E',
    fontSize: 16,
    fontWeight: '600',
  },
});
