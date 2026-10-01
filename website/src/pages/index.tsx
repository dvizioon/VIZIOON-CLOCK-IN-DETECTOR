import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import { Icon } from '@iconify/react'

const tabs = [
  { label: 'Início', icon: 'ph:house-fill', to: '/' },
  { label: 'Batidas', icon: 'ph:calendar-blank', to: '/docs/jornada' },
  { label: 'Prévia', icon: 'ph:play-circle', to: '/docs/telas' },
  { label: 'Logs', icon: 'ph:file-text', to: '/docs/alertas' },
  { label: 'Ajustes', icon: 'ph:gear', to: '/docs/instalacao' },
  { label: 'Sobre', icon: 'ph:info', to: '/docs/sobre' },
]

const rows = [
  { icon: 'ph:key', label: 'Acesso ao uso', value: 'liberar no celular' },
  { icon: 'ph:pulse', label: 'Monitor', value: 'fica em segundo plano' },
  { icon: 'ph:device-mobile', label: 'Ponto', value: 'Clock In na tela' },
  { icon: 'ph:camera', label: 'Câmera', value: 'ocupada na batida' },
]

export default function Home() {
  const { siteConfig } = useDocusaurusContext()
  const logo = useBaseUrl('/img/app-icon.png')

  return (
    <Layout title="Início" description={siteConfig.tagline}>
      <div className="app-stage">
        <article className="app-phone">
          <div className="app-home">
            <div className="app-head">
              <img src={logo} alt="" className="app-logo" />
              <div>
                <h1 className="app-title">Detector de ponto</h1>
                <p className="app-lead">{siteConfig.tagline}</p>
              </div>
            </div>

            <section className="app-card">
              {rows.map((row) => (
                <div key={row.label} className="app-row">
                  <Icon icon={row.icon} className="app-row__icon" aria-hidden />
                  <div>
                    <p className="app-row__label">{row.label}</p>
                    <p className="app-row__value">{row.value}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="app-card">
              <div className="app-month">
                <Icon icon="ph:chart-bar" aria-hidden />
                <span>O que avisa</span>
                <strong>2</strong>
              </div>
              <p className="app-note">A entrada e a saída para o almoço só ficam registradas.</p>
              <p className="app-note">O aviso é na volta do almoço e na saída do expediente.</p>
            </section>

            <Link className="app-button" to="/docs/intro">
              Ver documentação
            </Link>
            <Link className="app-button app-button--soft" to="/docs/versoes">
              Versão 1.0.0
            </Link>
          </div>

          <nav className="app-tabs" aria-label="Telas do aplicativo">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                to={tab.to}
                className={tab.to === '/' ? 'app-tab app-tab--on' : 'app-tab'}
              >
                <Icon icon={tab.icon} aria-hidden />
                <span>{tab.label}</span>
              </Link>
            ))}
          </nav>
        </article>
      </div>
    </Layout>
  )
}
