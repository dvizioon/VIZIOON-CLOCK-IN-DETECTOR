import { useEffect, useState, type ReactNode } from 'react';
import { AppState, FlatList, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { canDrawOverlay, listSystemSounds, openOverlaySettings, ensureOverlayPermission, setMonitorNotice, type SystemSound } from 'clock-in-monitor';
import { writeSettings } from '../schedule/storage';
import { previewAlarm, previewScreenAlert, previewSound, previewVibration, stopPreview } from '../schedule/alerts';
import { formatHours } from '../schedule/time';
import type { ScheduleSettings } from '../schedule/types';

type Props = {
  settings: ScheduleSettings;
  notificationsGranted: boolean | null;
  onOpenNotifications: () => void;
  onSave: (settings: ScheduleSettings) => void;
};

export function SettingsScreen({ settings, notificationsGranted, onOpenNotifications, onSave }: Props) {
  const [draft, setDraft] = useState(settings);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [picker, setPicker] = useState<'notification' | 'alarm' | null>(null);
  const [sounds, setSounds] = useState<SystemSound[]>([]);
  const [screenPreview, setScreenPreview] = useState(false);
  const [query, setQuery] = useState('');
  const [overlayGranted, setOverlayGranted] = useState<boolean | null>(null);

  useEffect(() => () => stopPreview(), []);
  useEffect(() => {
    const refresh = () => {
      void canDrawOverlay().then(setOverlayGranted);
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, []);

  function visible(...words: string[]) {
    const text = query.trim().toLocaleLowerCase('pt-BR');
    if (!text) return true;
    return words.some((word) => word.toLocaleLowerCase('pt-BR').includes(text));
  }

  const permissions = visible('notificação', 'notificações', 'permissão', 'acesso', 'sobre outros apps', 'sobrepor', 'monitor', 'ocultar');
  const work = visible('jornada');
  const lunch = visible('almoço');
  const lunchBefore = visible('almoço minutos antes', 'minutos antes');
  const lunchAfter = visible('almoço minutos depois', 'minutos depois');
  const exitBefore = visible('saída minutos antes', 'minutos antes');
  const exitAfter = visible('saída minutos depois', 'minutos depois');
  const volume = visible('volume', 'som');
  const touch = visible('toque', 'som');
  const vibration = visible('vibração', 'repetições', 'som');
  const message = visible('mensagem', 'aviso');
  const interval = visible('intervalo', 'alarme', 'som');
  const duration = visible('duração', 'alarme', 'som');
  const times = visible('vezes', 'alarme', 'som');
  const alarm = visible('alarme', 'som');
  const notice = visible('alerta', 'aviso');
  const screenAlert = visible('na tela', 'tela', 'aviso');
  const found =
    permissions ||
    work ||
    lunch ||
    lunchBefore ||
    lunchAfter ||
    exitBefore ||
    exitAfter ||
    volume ||
    touch ||
    vibration ||
    message ||
    interval ||
    duration ||
    times ||
    alarm ||
    notice ||
    screenAlert;

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Configurações</Text>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color="#6b7c90" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar"
          placeholderTextColor="#6b7c90"
        />
      </View>

      {permissions ? (
        <Section title="Permissões">
          <View style={styles.stepper}>
            <View style={styles.permissionRow}>
              <Text style={styles.stepperLabel}>Notificações</Text>
              <Text style={styles.permissionValue}>{notificationsGranted ? 'concedida' : 'pendente'}</Text>
            </View>
            {notificationsGranted === false ? (
              <Text style={styles.previewMessage}>Permita as notificações para avisar a batida.</Text>
            ) : null}
            <Pressable onPress={onOpenNotifications} hitSlop={8}>
              <Text style={styles.action}>Acessar a notificação</Text>
            </Pressable>
          </View>
          <View style={styles.stepper}>
            <View style={styles.permissionRow}>
              <Text style={styles.stepperLabel}>Sobre outros apps</Text>
              <Text style={styles.permissionValue}>{overlayGranted ? 'concedida' : 'pendente'}</Text>
            </View>
            {overlayGranted === false ? (
              <Text style={styles.previewMessage}>Permita exibir sobre outros apps para o alerta aparecer por cima.</Text>
            ) : null}
            <Pressable
              onPress={() => {
                void openOverlaySettings().then(() => canDrawOverlay().then(setOverlayGranted));
              }}
              hitSlop={8}
            >
              <Text style={styles.action}>Permitir sobre outros apps</Text>
            </Pressable>
          </View>
          <Toggle
            label="Notificação do monitor"
            value={draft.showMonitorNotice !== false}
            onChange={(showMonitorNotice) => {
              setDraft((current) => ({ ...current, showMonitorNotice }));
              void setMonitorNotice(showMonitorNotice);
              void writeSettings({ ...settings, showMonitorNotice });
            }}
          />
        </Section>
      ) : null}

      {work || lunch || lunchBefore || lunchAfter || exitBefore || exitAfter ? (
        <Section title="Jornada">
          {work ? (
            <Stepper
              label="Jornada"
              valueLabel={formatHours(draft.workHours)}
              onDecrease={() => setDraft((current) => ({ ...current, workHours: clamp(current.workHours - 0.5, 1, 12) }))}
              onIncrease={() => setDraft((current) => ({ ...current, workHours: clamp(current.workHours + 0.5, 1, 12) }))}
            />
          ) : null}
          {lunch ? (
            <Stepper
              label="Almoço"
              valueLabel={formatHours(draft.lunchHours)}
              onDecrease={() => setDraft((current) => ({ ...current, lunchHours: clamp(current.lunchHours - 0.5, 0, 4) }))}
              onIncrease={() => setDraft((current) => ({ ...current, lunchHours: clamp(current.lunchHours + 0.5, 0, 4) }))}
            />
          ) : null}
          {lunchBefore ? (
            <Stepper
              label="Almoço, minutos antes"
              valueLabel={`${draft.lunchBeforeMinutes} min`}
              onDecrease={() =>
                setDraft((current) => ({
                  ...current,
                  lunchBeforeMinutes: clamp(current.lunchBeforeMinutes - 1, 0, 60),
                }))
              }
              onIncrease={() =>
                setDraft((current) => ({
                  ...current,
                  lunchBeforeMinutes: clamp(current.lunchBeforeMinutes + 1, 0, 60),
                }))
              }
            />
          ) : null}
          {lunchAfter ? (
            <Stepper
              label="Almoço, minutos depois"
              valueLabel={`${draft.lunchAfterMinutes} min`}
              onDecrease={() =>
                setDraft((current) => ({
                  ...current,
                  lunchAfterMinutes: clamp(current.lunchAfterMinutes - 1, 0, 60),
                }))
              }
              onIncrease={() =>
                setDraft((current) => ({
                  ...current,
                  lunchAfterMinutes: clamp(current.lunchAfterMinutes + 1, 0, 60),
                }))
              }
            />
          ) : null}
          {exitBefore ? (
            <Stepper
              label="Saída, minutos antes"
              valueLabel={`${draft.toleranceBeforeMinutes} min`}
              onDecrease={() =>
                setDraft((current) => ({
                  ...current,
                  toleranceBeforeMinutes: clamp(current.toleranceBeforeMinutes - 1, 0, 60),
                }))
              }
              onIncrease={() =>
                setDraft((current) => ({
                  ...current,
                  toleranceBeforeMinutes: clamp(current.toleranceBeforeMinutes + 1, 0, 60),
                }))
              }
            />
          ) : null}
          {exitAfter ? (
            <Stepper
              label="Saída, minutos depois"
              valueLabel={`${draft.toleranceAfterMinutes} min`}
              onDecrease={() =>
                setDraft((current) => ({
                  ...current,
                  toleranceAfterMinutes: clamp(current.toleranceAfterMinutes - 1, 0, 60),
                }))
              }
              onIncrease={() =>
                setDraft((current) => ({
                  ...current,
                  toleranceAfterMinutes: clamp(current.toleranceAfterMinutes + 1, 0, 60),
                }))
              }
            />
          ) : null}
        </Section>
      ) : null}

      {volume || touch || vibration || interval || duration || times || alarm ? (
        <Section title="Som">
          {touch ? (
            <Pressable
              style={styles.stepper}
              onPress={() => {
                setPicker('notification');
                void listSystemSounds('notification').then(setSounds);
              }}
            >
              <Text style={styles.stepperLabel}>Toque</Text>
              <Text style={styles.soundName}>{draft.soundTitle}</Text>
            </Pressable>
          ) : null}
          {touch ? (
            <Toggle
              label="Toque"
              value={draft.sound}
              onChange={(sound) => setDraft((current) => ({ ...current, sound }))}
              actionLabel="Ouvir"
              onAction={() => {
                setPreviewMessage(null);
                void previewSound(draft).then(setPreviewMessage);
              }}
              onStop={stopPreview}
            />
          ) : null}
          {volume ? (
            <Stepper
              label="Volume"
              valueLabel={`${draft.volume * 10}%`}
              onDecrease={() => setDraft((current) => ({ ...current, volume: clamp(current.volume - 1, 0, 10) }))}
              onIncrease={() => setDraft((current) => ({ ...current, volume: clamp(current.volume + 1, 0, 10) }))}
            />
          ) : null}
          {vibration ? (
            <Toggle
              label="Vibração"
              value={draft.vibration}
              onChange={(vibrationOn) => setDraft((current) => ({ ...current, vibration: vibrationOn }))}
              actionLabel="Testar"
              onAction={() => {
                setPreviewMessage(null);
                previewVibration(draft);
              }}
              onStop={stopPreview}
            />
          ) : null}
          {vibration ? (
            <Stepper
              label="Repetições"
              valueLabel={`${draft.vibrationCount}x`}
              onDecrease={() =>
                setDraft((current) => ({ ...current, vibrationCount: clamp(current.vibrationCount - 1, 1, 10) }))
              }
              onIncrease={() =>
                setDraft((current) => ({ ...current, vibrationCount: clamp(current.vibrationCount + 1, 1, 10) }))
              }
            />
          ) : null}
          {alarm ? (
            <Pressable
              style={styles.stepper}
              onPress={() => {
                setPicker('alarm');
                void listSystemSounds('alarm').then(setSounds);
              }}
            >
              <Text style={styles.stepperLabel}>Alarme</Text>
              <Text style={styles.soundName}>{draft.alarmTitle}</Text>
            </Pressable>
          ) : null}
          {alarm ? (
            <Toggle
              label="Alarme"
              value={draft.alarm}
              onChange={(alarmOn) => setDraft((current) => ({ ...current, alarm: alarmOn }))}
              actionLabel="Ouvir"
              onAction={() => {
                setPreviewMessage(null);
                void previewAlarm(draft).then(setPreviewMessage);
              }}
              onStop={stopPreview}
            />
          ) : null}
          {interval ? (
            <Stepper
              label="Intervalo"
              valueLabel={`${draft.alarmIntervalMinutes} min`}
              onDecrease={() =>
                setDraft((current) => ({
                  ...current,
                  alarmIntervalMinutes: clamp(current.alarmIntervalMinutes - 1, 1, 30),
                }))
              }
              onIncrease={() =>
                setDraft((current) => ({
                  ...current,
                  alarmIntervalMinutes: clamp(current.alarmIntervalMinutes + 1, 1, 30),
                }))
              }
            />
          ) : null}
          {duration ? (
            <Stepper
              label="Duração"
              valueLabel={`${draft.alarmSeconds} s`}
              onDecrease={() => setDraft((current) => ({ ...current, alarmSeconds: clamp(current.alarmSeconds - 1, 1, 30) }))}
              onIncrease={() => setDraft((current) => ({ ...current, alarmSeconds: clamp(current.alarmSeconds + 1, 1, 30) }))}
            />
          ) : null}
          {times ? (
            <Stepper
              label="Vezes"
              valueLabel={`${draft.alarmTimes}x`}
              onDecrease={() => setDraft((current) => ({ ...current, alarmTimes: clamp(current.alarmTimes - 1, 1, 10) }))}
              onIncrease={() => setDraft((current) => ({ ...current, alarmTimes: clamp(current.alarmTimes + 1, 1, 10) }))}
            />
          ) : null}
        </Section>
      ) : null}

      {notice || screenAlert || message ? (
        <Section title="Aviso">
          {notice ? (
            <Toggle
              label="Alerta"
              value={draft.alert}
              onChange={(alert) => setDraft((current) => ({ ...current, alert }))}
            />
          ) : null}
          {screenAlert ? (
            <Toggle
              label="Na tela"
              value={draft.screenAlert}
              onChange={(enabled) => {
                setDraft((current) => ({ ...current, screenAlert: enabled }));
                if (enabled) void ensureOverlayPermission();
              }}
              actionLabel={draft.screenAlert ? 'Ver' : undefined}
              onAction={
                draft.screenAlert
                  ? () => {
                      const message = draft.noticeMessage.trim() || 'Hora de bater o ponto.';
                      void previewScreenAlert('Ponto', message).then((shown) => {
                        if (!shown) setScreenPreview(true);
                      });
                    }
                  : undefined
              }
            />
          ) : null}
          {message ? (
            <View style={styles.stepper}>
              <Text style={styles.stepperLabel}>Mensagem</Text>
              <TextInput
                style={styles.input}
                value={draft.noticeMessage}
                onChangeText={(noticeMessage) => setDraft((current) => ({ ...current, noticeMessage }))}
                placeholder="Hora de bater o ponto."
                placeholderTextColor="#6b7c90"
              />
            </View>
          ) : null}
        </Section>
      ) : null}

      {found ? null : <Text style={styles.empty}>Nada com esse nome.</Text>}
      {previewMessage ? <Text style={styles.previewMessage}>{previewMessage}</Text> : null}


      <Pressable style={styles.button} onPress={() => onSave(draft)}>
        <Text style={styles.buttonLabel}>Salvar</Text>
      </Pressable>

      <Modal visible={picker != null} animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.modal}>
          <Pressable onPress={() => setPicker(null)} hitSlop={8}>
            <Text style={styles.back}>Fechar</Text>
          </Pressable>
          <Text style={styles.title}>{picker === 'alarm' ? 'Alarmes' : 'Toques'}</Text>
          <FlatList
            data={sounds}
            keyExtractor={(item) => `${picker}-${item.uri || item.title}`}
            contentContainerStyle={styles.soundList}
            renderItem={({ item }) => {
              const selected = picker === 'alarm' ? item.uri === draft.alarmUri : item.uri === draft.soundUri;
              return (
                <Pressable
                  style={[styles.soundRow, selected ? styles.soundRowSelected : null]}
                  onPress={() => {
                    if (picker === 'alarm') {
                      const next = { ...draft, alarmUri: item.uri, alarmTitle: item.title, alarm: true };
                      setDraft(next);
                      setPicker(null);
                      void previewAlarm(next);
                      return;
                    }
                    const next = { ...draft, soundUri: item.uri, soundTitle: item.title, sound: true };
                    setDraft(next);
                    setPicker(null);
                    void previewSound(next);
                  }}
                >
                  <Text style={styles.soundName}>{item.title}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>

      <Modal visible={screenPreview} animationType="fade" onRequestClose={() => undefined}>
        <View style={styles.overlay}>
          <Text style={styles.overlayKicker}>Ponto</Text>
          <Text style={styles.overlayMessage}>{draft.noticeMessage.trim() || 'Hora de bater o ponto.'}</Text>
          <View style={styles.overlaySpacer} />
          <Pressable style={styles.overlayOk} onPress={() => setScreenPreview(false)}>
            <Text style={styles.overlayOkLabel}>OK</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function Stepper({
  label,
  valueLabel,
  onDecrease,
  onIncrease,
}: {
  label: string;
  valueLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable style={styles.step} onPress={onDecrease}>
          <Text style={styles.stepLabel}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{valueLabel}</Text>
        <Pressable style={styles.step} onPress={onIncrease}>
          <Text style={styles.stepLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
  actionLabel,
  onAction,
  onStop,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  actionLabel?: string;
  onAction?: () => void;
  onStop?: () => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.toggleActions}>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {onStop ? (
          <Pressable onPress={onStop} hitSlop={8}>
            <Text style={styles.action}>Parar</Text>
          </Pressable>
        ) : null}
        <Switch value={value} onValueChange={onChange} />
      </View>
    </View>
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#102033',
    paddingVertical: 0,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5E4B8B',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  empty: {
    fontSize: 15,
    color: '#6b7c90',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3d4d60',
  },
  stepper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  stepperLabel: {
    fontSize: 16,
    color: '#102033',
    fontWeight: '600',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionValue: {
    fontSize: 16,
    color: '#3d4d60',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e7eef8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 24,
    color: '#2A1B4E',
    fontWeight: '600',
  },
  stepValue: {
    fontSize: 18,
    color: '#102033',
    fontWeight: '700',
  },
  toggle: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  action: {
    color: '#2A1B4E',
    fontSize: 16,
    fontWeight: '600',
  },
  soundName: {
    fontSize: 16,
    color: '#102033',
  },
  input: {
    fontSize: 16,
    color: '#102033',
    paddingVertical: 4,
  },
  modal: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  soundList: {
    paddingTop: 16,
    paddingBottom: 40,
    gap: 8,
  },
  soundRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  soundRowSelected: {
    borderWidth: 2,
    borderColor: '#2A1B4E',
  },
  previewMessage: {
    color: '#9b2331',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#2A1B4E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonLabel: {
    color: '#fff',
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
