import React, { type ComponentProps } from 'react'
import Original from '@theme-original/Footer/Link'
import { Icon } from '@iconify/react'

type Props = ComponentProps<typeof Original>

const FOOTER_ICONS: Record<string, string> = {
  Começar: 'ph:book-open-fill',
  Instalação: 'ph:download-simple-fill',
  Navegadores: 'ph:browser-fill',
  Versões: 'ph:tag-fill',
  Privacidade: 'ph:shield-check-fill',
  GitHub: 'simple-icons:github',
  'E-mail': 'ph:envelope-fill',
}

function LabelWithIcon({ icon, label }: { icon: string; label: React.ReactNode }) {
  return (
    <span className="footer-link-with-icon">
      <Icon icon={icon} className="footer-link-with-icon__icon" aria-hidden />
      <span>{label}</span>
    </span>
  )
}

export default function FooterLink(props: Props): React.ReactNode {
  const label = props.item?.label
  const icon = typeof label === 'string' ? FOOTER_ICONS[label] : undefined

  if (!icon || typeof label !== 'string') return <Original {...props} />

  return (
    <Original
      {...props}
      item={{
        ...props.item,
        label: <LabelWithIcon icon={icon} label={label} />,
      }}
    />
  )
}
