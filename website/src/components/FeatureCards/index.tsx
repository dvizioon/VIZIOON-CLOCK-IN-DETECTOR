import { Icon } from '@iconify/react'

type Feature = {
  icon: string
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    icon: 'ph:eye-fill',
    title: 'Vê o Clock In',
    description:
      'Junta o aplicativo na frente da tela com a câmera ocupada. Não tira foto e não lê o rosto.',
  },
  {
    icon: 'ph:bell-ringing-fill',
    title: 'Avisa a volta e a saída',
    description:
      'A entrada e a saída para o almoço só ficam registradas. O aviso é na volta e no fim do expediente.',
  },
  {
    icon: 'ph:plus-circle-fill',
    title: 'Ponto adicional',
    description:
      'Uma batida fora do intervalo da volta ou da saída fica extra e não cancela os avisos.',
  },
  {
    icon: 'ph:note-pencil-fill',
    title: 'Observação',
    description: 'Em Batidas, cada ponto aceita um texto seu. Fica só neste celular.',
  },
]

export default function FeatureCards() {
  return (
    <div className="feature-grid">
      {FEATURES.map((feature) => (
        <article key={feature.title} className="feature-card">
          <span className="feature-card__icon-wrap" aria-hidden>
            <Icon icon={feature.icon} className="feature-card__icon" />
          </span>
          <h3 className="feature-card__title">{feature.title}</h3>
          <p className="feature-card__desc">{feature.description}</p>
        </article>
      ))}
    </div>
  )
}
