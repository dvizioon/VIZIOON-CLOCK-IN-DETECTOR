import React from 'react'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import Original from '@theme-original/NavbarItem/NavbarNavLink'
import type { Props } from '@theme/NavbarItem/NavbarNavLink'

function skipExternalIcon(className?: string) {
  return (
    className?.includes('navbar-github-link') ||
    className?.includes('navbar-contato-link')
  )
}

export default function NavbarNavLink(props: Props): React.ReactNode {
  const { href, label, prependBaseUrlToHref, className, ...rest } = props

  if (!skipExternalIcon(className) || !href) {
    return <Original {...props} />
  }

  const normalizedHref = useBaseUrl(href, { forcePrependBaseUrl: true })

  return (
    <Link
      href={prependBaseUrlToHref ? normalizedHref : href}
      className={className}
      {...rest}
    >
      {label}
    </Link>
  )
}
