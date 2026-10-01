import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'instalacao',
    {
      type: 'category',
      label: 'Guia',
      collapsed: false,
      customProps: { icon: 'ph:map-trifold-fill' },
      items: ['jornada', 'alertas', 'telas'],
    },
    'sobre',
    'versoes',
    'privacidade',
  ],
}

export default sidebars
