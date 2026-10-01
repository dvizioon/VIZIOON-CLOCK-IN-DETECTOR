import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const org = 'dvizioon'
const project = 'clock-in-detector'

const config: Config = {
  title: 'Detector de ponto',
  tagline: 'Avisa a volta do almoço e a saída do expediente a partir do Clock In.',
  favicon: 'img/app-icon.png',

  future: {
    v4: true,
  },

  url: `https://${org}.github.io`,
  baseUrl: `/${project}/`,
  organizationName: org,
  projectName: project,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Detector de ponto',
      logo: {
        alt: 'Detector de ponto',
        src: 'img/app-icon.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentação',
        },
        {
          type: 'doc',
          docId: 'versoes',
          position: 'left',
          label: 'Versões',
        },
        {
          href: `https://github.com/${org}/${project}`,
          position: 'right',
          className: 'navbar-github-link',
          'aria-label': 'Repositório no GitHub',
        },
        {
          href: 'mailto:danielmartinsjob@gmail.com',
          position: 'right',
          className: 'navbar-contato-link',
          'aria-label': 'Contato por e-mail',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentação',
          items: [
            { label: 'Começar', to: '/docs/intro' },
            { label: 'Instalação', to: '/docs/instalacao' },
            { label: 'Jornada', to: '/docs/jornada' },
            { label: 'Versões', to: '/docs/versoes' },
            { label: 'Privacidade', to: '/docs/privacidade' },
          ],
        },
        {
          title: 'Contato',
          items: [
            { label: 'GitHub', href: `https://github.com/${org}/${project}` },
            { label: 'E-mail', href: 'mailto:danielmartinsjob@gmail.com' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Vizioon · Daniel Estevão`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
