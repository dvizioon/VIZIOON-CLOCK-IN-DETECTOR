import React from 'react'
import Original from '@theme-original/DocSidebarItem/Category'
import { Icon } from '@iconify/react'
import type { Props } from '@theme/DocSidebarItem/Category'

function LabelWithIcon({ icon, label }: { icon: string; label: React.ReactNode }) {
  return (
    <span className="sidebar-item-with-icon">
      <Icon icon={icon} className="sidebar-item-with-icon__icon" aria-hidden />
      <span>{label}</span>
    </span>
  )
}

export default function DocSidebarItemCategory(props: Props): React.ReactNode {
  const icon = props.item.customProps?.icon as string | undefined
  if (!icon) return <Original {...props} />

  return (
    <Original
      {...props}
      item={
        {
          ...props.item,
          label: <LabelWithIcon icon={icon} label={props.item.label} />,
        } as unknown as Props['item']
      }
    />
  )
}
