import React from 'react'
import Original from '@theme-original/NavbarItem/DefaultNavbarItem'
import { Icon } from '@iconify/react'
import type { Props } from '@theme/NavbarItem/DefaultNavbarItem'

function NavbarIconLabel({
  icon,
  className,
  srText,
}: {
  icon: string
  className: string
  srText: string
}) {
  return (
    <span className={`${className}__label`}>
      <Icon icon={icon} className={`${className}__icon`} aria-hidden />
      <span className="sr-only">{srText}</span>
    </span>
  )
}

export default function DefaultNavbarItem(props: Props): React.ReactNode {
  if (props.className?.includes('navbar-github-link')) {
    return (
      <Original
        {...props}
        label={
          <NavbarIconLabel
            icon="simple-icons:github"
            className="navbar-github-link"
            srText="GitHub"
          />
        }
      />
    )
  }

  if (props.className?.includes('navbar-contato-link')) {
    return (
      <Original
        {...props}
        label={
          <NavbarIconLabel
            icon="ph:envelope-fill"
            className="navbar-contato-link"
            srText="Contato por e-mail"
          />
        }
      />
    )
  }

  return <Original {...props} />
}
