import useBaseUrl from '@docusaurus/useBaseUrl'
import { useEffect, useState } from 'react'

const GITHUB_RELEASES =
  'https://api.github.com/repos/dvizioon/clock-in-detector/releases?per_page=30'

type Release = {
  tag: string
  prerelease: boolean
  publishedAt: string
  changes: string[]
  installUrl: string | null
}

type LocalRelease = {
  tag: string
  date: string
  changes: string[]
  installUrl?: string | null
}

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
  const files = assets as Array<{ name?: string; browser_download_url?: string }>
  const apk = files.find((asset) => asset.name?.toLowerCase().endsWith('.apk'))
  return (apk ?? files[0])?.browser_download_url ?? null
}

export default function VersionTimeline() {
  const localUrl = useBaseUrl('/releases.json')
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      let mapped: Release[] = []
      try {
        const res = await fetch(GITHUB_RELEASES, {
          headers: { Accept: 'application/vnd.github+json' },
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            mapped = data.map((item: Record<string, unknown>) => ({
              tag: (item.tag_name as string) || '',
              prerelease: !!item.prerelease,
              publishedAt: (item.published_at as string) || '',
              changes: parseBody((item.body as string) || ''),
              installUrl: pickInstallUrl(item.assets),
            }))
          }
        }
      } catch {
        mapped = []
      }

      if (mapped.length === 0) {
        const res = await fetch(localUrl)
        if (res.ok) {
          const data = (await res.json()) as LocalRelease[]
          mapped = data.map((item) => ({
            tag: item.tag,
            prerelease: false,
            publishedAt: item.date,
            changes: item.changes,
            installUrl: item.installUrl ?? null,
          }))
        }
      }

      if (!cancelled) {
        setReleases(mapped)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [localUrl])

  if (loading || releases.length === 0) return null

  return (
    <div className="version-timeline">
      <ol className="version-timeline__list">
        {releases.map((entry, index) => (
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
