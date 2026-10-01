---
title: Versões
slug: /versoes
sidebar_custom_props:
  icon: ph:tag-fill
---

import VersionTimeline from '@site/src/components/VersionTimeline';

# Versões

Cada release lista o que entrou naquela versão. A atual é a que está marcada abaixo.

A lista começa no arquivo `website/static/releases.json`, que vai junto no Git. Quando existir uma release publicada em `dvizioon/clock-in-detector`, a página usa o texto e o APK anexado lá.

Para registrar a próxima versão, acrescente um objeto no começo desse arquivo, suba a versão em `app.json` e, no GitHub, publique a release com a mesma tag e o APK.

```json
{
  "tag": "v1.1.0",
  "date": "2026-10-15",
  "changes": [
    "O que mudou nesta versão."
  ]
}
```

<VersionTimeline />
