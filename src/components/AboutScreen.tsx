import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

const logo = require('../../assets/icon.png');

const REPO_URL = 'https://github.com/dvizioon/clock-in-detector';
const RELEASES_URL =
  'https://api.github.com/repos/dvizioon/clock-in-detector/releases?per_page=20';

type Release = {
  tag: string;
  changes: string[];
  apk: string | null;
};

const FALLBACK: Release[] = [
  {
    tag: 'v1.0.0',
    changes: [
      'Detecta o Clock In pela tela e pela câmera ocupada.',
      'Avisa a volta do almoço e a saída do expediente.',
      'Ponto adicional não cancela os avisos.',
      'Observação em cada batida.',
    ],
    apk: null,
  },
];

function parseBody(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('*'))
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .filter(Boolean);
}

function pickApk(assets: unknown): string | null {
  if (!Array.isArray(assets)) return null;
  const files = assets as { name?: string; browser_download_url?: string }[];
  const apk = files.find((asset) => asset.name?.toLowerCase().endsWith('.apk'));
  return apk?.browser_download_url ?? null;
}

async function loadReleases(): Promise<Release[]> {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) return FALLBACK;
    const data = (await response.json()) as Record<string, unknown>[];
    if (!Array.isArray(data) || data.length === 0) return FALLBACK;
    return data.map((item) => ({
      tag: String(item.tag_name ?? ''),
      changes: parseBody(String(item.body ?? '')),
      apk: pickApk(item.assets),
    }));
  } catch {
    return FALLBACK;
  }
}

function openLink(url: string) {
  void Linking.openURL(url);
}

export function AboutScreen() {
  const [releases, setReleases] = useState<Release[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    void loadReleases().then((next) => {
      if (!cancelled) setReleases(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.content}>
      <View style={styles.hero}>
        <View style={styles.logoFrame}>
          <Image source={logo} style={styles.logo} resizeMode="cover" />
        </View>
        <Text style={styles.name}>DETECTOR DE PONTO</Text>
        <Text style={styles.tagline}>VIZIOON</Text>
        <Text style={styles.desc}>Monitora o ponto e avisa na hora das próximas batidas.</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </View>

      <Pressable style={styles.card} onPress={() => openLink(REPO_URL)}>
        <Ionicons name="logo-github" size={22} color="#2A1B4E" />
        <View style={styles.cardText}>
          <Text style={styles.cardLabel}>GitHub</Text>
          <Text style={styles.cardValue}>dvizioon/clock-in-detector</Text>
        </View>
      </Pressable>

      <View style={styles.cardBlock}>
        <Text style={styles.section}>Versões</Text>
        {releases.map((release) => (
          <View key={release.tag} style={styles.release}>
            <Text style={styles.releaseTag}>{release.tag}</Text>
            {release.changes.map((line) => (
              <Text key={line} style={styles.releaseLine}>
                {line}
              </Text>
            ))}
            {release.apk ? (
              <Pressable style={styles.download} onPress={() => openLink(release.apk!)}>
                <Text style={styles.downloadLabel}>Baixar APK</Text>
              </Pressable>
            ) : (
              <Text style={styles.pending}>O APK aparece quando a release estiver no GitHub.</Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.credit}>
        <Text style={styles.creditLabel}>Desenvolvido por</Text>
        <Text style={styles.creditName}>Daniel Estevão</Text>
        <View style={styles.brand}>
          <Ionicons name="business-outline" size={18} color="#2A1B4E" />
          <Text style={styles.creditBrand}>Vizioon</Text>
        </View>
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
  hero: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d7e3f2',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#2A1B4E',
  },
  logo: {
    width: 96,
    height: 96,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#2A1B4E',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#5E4B8B',
  },
  desc: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#424240',
  },
  version: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#2A1B4E',
    backgroundColor: '#D8D2FC',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#6b7c90',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#102033',
  },
  cardBlock: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#102033',
  },
  release: {
    gap: 4,
  },
  releaseTag: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A1B4E',
  },
  releaseLine: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3d4d60',
  },
  download: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#2A1B4E',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  downloadLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  pending: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7c90',
  },
  credit: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
  },
  creditLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#6b7c90',
  },
  creditName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1B4E',
  },
  creditBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#102033',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
