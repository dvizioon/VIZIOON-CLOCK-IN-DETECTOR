<div align="center">
  <img src="assets/icon.png" alt="Logo do Detector de ponto" width="180" />
</div>

<br />

<h1 align="center">Detector de ponto</h1>

<p align="center">
  Avisa a volta do almoço e a saída do expediente a partir do TOTVS Clock In.<br />
  A entrada e a saída para o almoço só ficam registradas.<br />
  O aviso é na volta e no fim do dia.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-57-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white" />
  <br />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Kotlin-Android-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" />
  <img src="https://img.shields.io/badge/VERSION-1.0.0-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/IDIOMA-pt--BR-2A1B4E?style=for-the-badge" />
</p>

<p align="center">
  <a href="https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/">Documentação</a> ·
  <a href="https://github.com/dvizioon/VIZIOON-CLOCK-IN-DETECTOR">GitHub</a> ·
  <a href="mailto:danielmartinsjob@gmail.com">Contato</a>
</p>

---

## O que é

Aplicativo Android que observa o TOTVS RH Clock In neste celular. Não abre a câmera, não tira foto e não lê o armazenamento do Clock In.

Dois sinais juntos contam como batida: o Clock In na frente da tela e a câmera ocupada. O horário fica neste aparelho. Nada disso vai para um servidor.

| Na tela | No código | Significado |
| --- | --- | --- |
| Entrada | `entry` | Primeira batida do dia. Não avisa |
| Saída para o almoço | `lunchOut` | Batida depois da entrada. Não avisa. Define a volta |
| Volta do almoço | `lunchIn` | Hora da saída para o almoço mais o almoço configurado. Avisa |
| Saída | `exit` | Entrada mais a jornada e o almoço. Avisa |
| Ponto adicional | `extras` | Batida fora desses intervalos. Não cancela os avisos |

A documentação publicada fica em [dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR](https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/).

---

## Como funciona

```text
Clock In na frente          Câmera ocupada
        |                         |
        +-----------+-------------+
                    |
                    v
        Reconhecimento provável
                    |
                    v
     Entrada cria o dia e agenda volta e saída
     Saída para o almoço grava a volta real
     Ponto fora da janela fica adicional
                    |
                    v
        Aviso na volta e na saída
        (notificação, som e, se ligado, janela na tela)
```

1. A pessoa bate a entrada no Clock In. Essa hora abre o dia. O detector não avisa.
2. A saída para o almoço também não avisa. A volta passa a ser essa hora mais o almoço configurado.
3. A volta avisa no intervalo dela (padrão 2 minutos antes, na hora e 2 depois).
4. A saída do expediente nasce da entrada, somando a jornada e o almoço. Não muda se o almoço foi cedo ou tarde. O aviso usa o intervalo dela (padrão 5 minutos).
5. Uma batida fora da volta e fora da saída fica como ponto adicional. Os avisos continuam.

Exemplo: entrada às 8:00, jornada de 8 horas, almoço de 1 hora, saída para o almoço às 12:00. A volta avisa às 12:58, às 13:00 e às 13:02. A saída das 17:00 avisa às 16:55, às 17:00 e às 17:05. Uma batida às 12:30 fica adicional e não cancela a volta.

---

## Peças

- **Monitor.** Serviço em segundo plano. Continua vendo o Clock In com o detector fechado e volta depois de reiniciar o celular, se estava ligado.
- **Aviso na tela.** Janela no meio, com a logo, o som e o alarme, até o OK. Com a tela bloqueada, também sai a notificação.
- **Batidas.** Lista do dia e observação em cada ponto. O texto grava ao sair do campo.
- **Prévia.** Item do menu. Dispara a volta e a saída no intervalo escolhido ali, inclusive com o app em segundo plano.
- **Logs.** Câmera, aplicativo da frente e o reconhecimento. **Evento** deixa só a batida. **Clock In** deixa só o que é do Clock In. **Copiar** copia a lista filtrada.
- **Sobre.** Logo, versão, crédito e o GitHub. As releases vêm da API. Sem internet, a tela avisa que não foi possível carregar. **Baixar APK** abre o arquivo anexado na release.

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript
- Módulo Kotlin `ClockInMonitor`, em `modules/clock-in-monitor`
- Pacote do app: `com.clockindetector.app`
- Pacote observado: `com.clockinfieldtools`
- Interface em português do Brasil

---

## Estrutura

```text
VIZIOON-CLOCK-IN-DETECTOR/
├── App.tsx                      telas e menu de baixo
├── assets/                      logo e ícones
├── modules/clock-in-monitor/    serviço Android, alerta e boot
├── plugins/                     nome do APK
├── src/
│   ├── components/              Início, Batidas, Prévia, Logs, Ajustes, Sobre
│   ├── logs/                    histórico e filtro
│   └── schedule/                jornada, avisos e arquivo do dia
├── website/                     documentação publicada
└── android/                     gerada no build. Não vai para o Git
```

| Tela | O que mostra |
| --- | --- |
| Início | Logo, acesso ao uso, monitor, Clock In, câmera e os gráficos |
| Batidas | Pontos do dia, inclusive o adicional, e a observação |
| Prévia | Avisos de teste com o tempo correndo |
| Logs | Eventos, filtro e copiar |
| Ajustes | Permissões, jornada, som e aviso |
| Sobre | Versão, GitHub e releases |

---

## Como rodar

O Expo Go não traz o módulo nativo. O celular recebe o APK deste projeto.

```bash
npm install
npx expo run:android
```

O APK para instalar sem o computador ligado é o release. O nome do arquivo é `clock-in-detector.apk`.

```bash
cd android
./gradlew assembleRelease
```

O arquivo fica em `android/app/build/outputs/apk/release/clock-in-detector.apk`. O debug fica em `android/app/build/outputs/apk/debug/clock-in-detector.apk` e só serve com o Metro aberto.

| Comando | Efeito |
| --- | --- |
| `npx expo run:android` | Compila, instala o debug e sobe o Metro |
| `cd android && ./gradlew assembleRelease` | Gera o APK de release |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Checagem de tipos |
| `npm run docs` | Sobe a documentação em `http://localhost:3000/VIZIOON-CLOCK-IN-DETECTOR/` |

No celular, libere o acesso ao uso, as notificações e, para o alerta no meio da tela, exibir sobre outros apps. No Samsung, deixe o app sem restrição de bateria.

---

## Onde está cada assunto

| Página | Conteúdo |
| --- | --- |
| [Introdução](https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/docs/intro) | O que o aplicativo faz |
| [Instalação](https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/docs/instalacao) | APK de release e permissões |
| [Jornada](https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/docs/jornada) | Entrada, almoço, volta, saída e ponto adicional |
| [Alertas](https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/docs/alertas) | Janela, som e segundo plano |
| [Telas](https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/docs/telas) | Menu do aplicativo |
| [Versões](https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/docs/versoes) | O que cada release traz e o APK |
| [Privacidade](https://dvizioon.github.io/VIZIOON-CLOCK-IN-DETECTOR/docs/privacidade) | O que fica no celular |

## Arquivos e privacidade

Horários e logs ficam no aparelho, em `clock-schedule.json` e `clock-logs.json`. O detector não envia esses dados. A câmera só é observada: o app não pede a permissão `CAMERA`.

## Contato

Desenvolvido por Daniel Estevão, Vizioon.

[danielmartinsjob@gmail.com](mailto:danielmartinsjob@gmail.com) · [GitHub](https://github.com/dvizioon/VIZIOON-CLOCK-IN-DETECTOR)

Detector de ponto 2026. Vizioon.
