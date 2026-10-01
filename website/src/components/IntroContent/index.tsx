import IntroHero from '@site/src/components/IntroHero'
import FeatureCards from '@site/src/components/FeatureCards'
import DocQuickLinks from '@site/src/components/DocQuickLinks'

export default function IntroContent() {
  return (
    <div className="intro-content">
      <IntroHero />

      <section className="intro-section">
        <h2 className="intro-section__title">O que o aplicativo faz</h2>
        <FeatureCards />
      </section>

      <p className="intro-note">
        O detector não abre o armazenamento do Clock In. Ele só vê se o Clock In está na tela e se
        a câmera ficou ocupada. QR Code no mesmo aplicativo também conta como batida.
      </p>

      <DocQuickLinks />
    </div>
  )
}
