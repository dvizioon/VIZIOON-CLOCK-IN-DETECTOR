import { useEffect, useState } from 'react'

const GITHUB_RELEASES =
  'https://api.github.com/repos/dvizioon/VIZIOON-CLOCK-IN-DETECTOR/releases?per_page=30'

type Release = {
  tag: string
  prerelease: boolean
  publishedAt: string
  changes: string[]
  installUrl: string | null
}

type ReleasesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; releases: Release[] }

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function parseBody(body: string): string[] {
  if (!body.trim()) return []
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]/.test(line))
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .filter(Boolean)
}

function pickInstallUrl(assets: unknown): string | null {
  if (!Array.isArray(assets) || assets.length === 0) return null
  const files = assets as { name?: string; browser_download_url?: string }[]
  const apk = files.find((asset) => asset.name?.toLowerCase().endsWith('.apk'))
  return (apk ?? files[0])?.browser_download_url ?? null
}

export default function VersionTimeline() {
  const [state, setState] = useState<ReleasesState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(GITHUB_RELEASES, {
          headers: { Accept: 'application/vnd.github+json' },
        })
        if (!res.ok) {
          if (!cancelled) setState({ status: 'error' })
          return
        }
        const data = (await res.json()) as Record<string, unknown>[]
        if (!Array.isArray(data) || data.length === 0) {
          if (!cancelled) setState({ status: 'empty' })
          return
        }
        if (!cancelled) {
          setState({
            status: 'ready',
            releases: data.map((item) => ({
              tag: (item.tag_name as string) || '',
              prerelease: !!item.prerelease,
              publishedAt: (item.published_at as string) || '',
              changes: parseBody((item.body as string) || ''),
              installUrl: pickInstallUrl(item.assets),
            })),
          })
        }
      } catch {
        if (!cancelled) setState({ status: 'error' })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return <p className="version-timeline__status">Carregando releases…</p>
  }
  if (state.status === 'error') {
    return (
      <p className="version-timeline__status">
        Não foi possível ver as releases. Sem internet, ou o GitHub não respondeu.
      </p>
    )
  }
  if (state.status === 'empty') {
    return <p className="version-timeline__status">Nenhuma release publicada ainda.</p>
  }

  return (
    <div className="version-timeline">
      <ol className="version-timeline__list">
        {state.releases.map((entry, index) => (
          <li key={entry.tag} className="version-timeline__item">
            <div className="version-timeline__marker" aria-hidden />
            <div className="version-timeline__card">
              <div className="version-timeline__head">
                <span className="version-timeline__version">{entry.tag}</span>
                {entry.publishedAt && (
                  <span className="version-timeline__date">{formatDate(entry.publishedAt)}</span>
                )}
                {index === 0 && !entry.prerelease && (
                  <span className="version-timeline__badge">atual</span>
                )}
                {entry.prerelease && (
                  <span className="version-timeline__badge version-timeline__badge--muted">beta</span>
                )}
                {entry.installUrl && (
                  <a
                    href={entry.installUrl}
                    className="version-timeline__badge version-timeline__badge--install"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    APK
                  </a>
                )}
              </div>
              {entry.changes.length > 0 && (
                <ul className="version-timeline__changes">
                  {entry.changes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              {entry.installUrl && (
                <a
                  href={entry.installUrl}
                  className="version-timeline__download"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Baixar APK
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
