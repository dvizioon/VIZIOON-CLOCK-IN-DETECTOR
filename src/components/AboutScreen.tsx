import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import app from '../../app.json';

const logo = require('../../assets/icon.png');

const REPO = 'dvizioon/VIZIOON-CLOCK-IN-DETECTOR';
const REPO_URL = `https://github.com/${REPO}`;
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases?per_page=20`;
const INSTALLED = app.expo.version;

type Release = {
  tag: string;
  url: string;
  apk: string | null;
};

type ReleasesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; releases: Release[] };

function versionParts(value: string): number[] {
  const parts = value
    .replace(/^v/i, '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((part) => Number(part));
  return parts.length > 0 ? parts : [0];
}

function compareVersions(left: string, right: string): number {
  const a = versionParts(left);
  const b = versionParts(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function updateTag(releases: Release[]): string | null {
  const newer = releases.filter((release) => compareVersions(release.tag, INSTALLED) > 0 && release.apk);
  if (newer.length === 0) return null;
  return newer.reduce((best, release) => (compareVersions(release.tag, best.tag) > 0 ? release : best)).tag;
}

function pickApk(assets: unknown): string | null {
  if (!Array.isArray(assets)) return null;
  const files = assets as { name?: string; browser_download_url?: string }[];
  const apk = files.find((asset) => asset.name?.toLowerCase().endsWith('.apk'));
  return apk?.browser_download_url ?? null;
}

async function loadReleases(): Promise<ReleasesState> {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) return { status: 'error' };
    const data = (await response.json()) as Record<string, unknown>[];
    if (!Array.isArray(data) || data.length === 0) return { status: 'empty' };
    return {
      status: 'ready',
      releases: data.map((item) => {
        const tag = String(item.tag_name ?? '');
        const page = typeof item.html_url === 'string' ? item.html_url : '';
        return {
          tag,
          url: page || `https://github.com/${REPO}/releases/tag/${tag}`,
          apk: pickApk(item.assets),
        };
      }),
    };
  } catch {
    return { status: 'error' };
  }
}

function openLink(url: string) {
  void Linking.openURL(url);
}

function ReleaseTimeline({ releases }: { releases: Release[] }) {
  const newer = updateTag(releases);
  return (
    <View>
      {releases.map((release, index) => {
        const installed = compareVersions(release.tag, INSTALLED) === 0;
        const last = index === releases.length - 1;
        return (
          <View key={release.tag} style={styles.timelineItem}>
            <View style={styles.rail}>
              <View style={installed ? styles.dotOn : styles.dot} />
              {last ? null : <View style={styles.line} />}
            </View>
            <Pressable style={styles.releaseCard} onPress={() => openLink(release.url)}>
              <View style={styles.releaseHead}>
                <Text style={styles.releaseTag}>{release.tag}</Text>
                {installed ? <Text style={styles.badge}>Instalada</Text> : null}
              </View>
              {release.tag === newer && release.apk ? (
                <Pressable
                  style={styles.download}
                  onPress={(event) => {
                    event.stopPropagation();
                    openLink(release.apk as string);
                  }}
                >
                  <Text style={styles.downloadLabel}>Atualizar</Text>
                </Pressable>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function AboutScreen() {
  const [releases, setReleases] = useState<ReleasesState>({ status: 'loading' });

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
        <Text style={styles.version}>v{INSTALLED}</Text>
      </View>

      <Pressable style={styles.card} onPress={() => openLink(REPO_URL)}>
        <Ionicons name="logo-github" size={22} color="#2A1B4E" />
        <View style={styles.cardText}>
          <Text style={styles.cardLabel}>GitHub</Text>
          <Text style={styles.cardValue}>{REPO}</Text>
        </View>
      </Pressable>

      <View style={styles.cardBlock}>
        <Text style={styles.section}>Versões</Text>
        {releases.status === 'loading' ? <Text style={styles.pending}>Carregando releases…</Text> : null}
        {releases.status === 'error' ? (
          <Text style={styles.pending}>
            Não foi possível carregar as releases. Sem internet, ou o GitHub não respondeu.
          </Text>
        ) : null}
        {releases.status === 'empty' ? (
          <Text style={styles.pending}>Nenhuma release publicada ainda.</Text>
        ) : null}
        {releases.status === 'ready' ? <ReleaseTimeline releases={releases.releases} /> : null}
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
  timelineItem: {
    flexDirection: 'row',
    gap: 10,
  },
  rail: {
    width: 16,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#2A1B4E',
    backgroundColor: '#fff',
  },
  dotOn: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 16,
    backgroundColor: '#2A1B4E',
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: '#d7e3f2',
  },
  releaseCard: {
    flex: 1,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#F4F1FF',
    padding: 12,
    gap: 8,
  },
  releaseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  releaseTag: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A1B4E',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2A1B4E',
    backgroundColor: '#D8D2FC',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
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
