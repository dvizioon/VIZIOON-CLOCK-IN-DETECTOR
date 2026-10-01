import Link from '@docusaurus/Link'
import { Icon } from '@iconify/react'

type QuickLink = {
  icon: string
  title: string
  description: string
  to: string
}

const LINKS: QuickLink[] = [
  {
    icon: 'ph:download-simple-fill',
    title: 'Instalação',
    description: 'Gere o APK de release e libere o acesso ao uso.',
    to: '/docs/instalacao',
  },
  {
    icon: 'ph:calendar-check-fill',
    title: 'Jornada',
    description: 'Entrada, almoço, volta, saída e ponto adicional.',
    to: '/docs/jornada',
  },
  {
    icon: 'ph:tag-fill',
    title: 'Versões',
    description: 'O que cada release deste aplicativo traz.',
    to: '/docs/versoes',
  },
]

export default function DocQuickLinks() {
  return (
    <div className="doc-quick-links">
      <h2 className="doc-quick-links__heading">Por onde começar</h2>
      <div className="doc-quick-links__grid">
        {LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="doc-quick-link">
            <Icon icon={link.icon} className="doc-quick-link__icon" aria-hidden />
            <span className="doc-quick-link__body">
              <span className="doc-quick-link__title">{link.title}</span>
              <span className="doc-quick-link__desc">{link.description}</span>
            </span>
            <Icon icon="ph:arrow-right-bold" className="doc-quick-link__arrow" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  )
}
