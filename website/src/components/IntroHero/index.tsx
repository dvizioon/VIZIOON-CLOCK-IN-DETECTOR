import useBaseUrl from '@docusaurus/useBaseUrl'

export default function IntroHero() {
  const logo = useBaseUrl('/img/app-icon.png')

  return (
    <div className="intro-hero">
      <img src={logo} alt="" className="app-logo" />
      <div>
        <p className="app-title">Detector de ponto</p>
        <p className="app-lead">
          Observa o TOTVS Clock In e avisa a volta do almoço e a saída do expediente. A conta
          começa na hora em que você bate a entrada.
        </p>
      </div>
    </div>
  )
}
