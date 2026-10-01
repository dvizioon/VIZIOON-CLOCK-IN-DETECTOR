---
title: Instalação
slug: /instalacao
sidebar_custom_props:
  icon: ph:download-simple-fill
---

# Instalação

O arquivo para instalar no celular é o APK de **release**. Ele funciona sem o computador ligado. O APK de debug só serve enquanto o Metro está aberto no computador.

O arquivo fica em `android/app/build/outputs/apk/release/app-release.apk` depois deste comando, na pasta do projeto:

```bash
cd android && ./gradlew assembleRelease
```

A versão atual é a **1.0.0**. O que ela contém está em [Versões](/docs/versoes).

## No celular

1. Copie o APK e instale. Se o Android pedir, permita instalar de fonte desconhecida.
2. Abra o detector e conceda o **acesso ao uso**. Sem isso ele não vê o Clock In na tela.
3. Em Ajustes, libere as notificações e, se for usar o alerta no meio da tela, **Sobre outros apps**.
4. No Samsung, deixe o aplicativo sem restrição de bateria e fora dos apps em suspensão. Se o celular dormir o monitor, a batida não entra.

O acesso ao uso é de cada aparelho. No A54 e no A14 ele precisa ser concedido de novo, mesmo que já tenha sido no outro celular.
