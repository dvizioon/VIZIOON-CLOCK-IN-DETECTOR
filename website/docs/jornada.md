---
title: Jornada
slug: /jornada
sidebar_custom_props:
  icon: ph:calendar-check-fill
---

# Jornada

O dia tem quatro pontos oficiais. A entrada é a primeira batida. A partir dela o aplicativo calcula a saída do expediente: entrada + jornada + almoço. O padrão é 8 horas de trabalho e 1 hora de almoço.

| Ponto | Avisa? |
| --- | --- |
| Entrada | Não |
| Saída para o almoço | Não. Só registra. A volta passa a ser essa hora mais o almoço |
| Volta do almoço | Sim, no intervalo da volta |
| Saída do expediente | Sim, no intervalo da saída |

O intervalo da volta usa os minutos de almoço. O padrão é 2 antes, na hora e 2 depois. O intervalo da saída usa os minutos da saída. O padrão é 5 antes, na hora e 5 depois.

## Exemplo

Entrou às 8:00. Saiu para o almoço às 12:00. A volta fica às 13:00 e a saída do expediente às 17:00.

| Aviso | Horários |
| --- | --- |
| Volta | 12:58, 13:00 e 13:02 |
| Saída | 16:55, 17:00 e 17:05 |

Quem entra às 12:00, com a mesma configuração, sai às 21:00. Almoço batido às 15:00 vira volta às 16:00. Batido às 15:12, volta às 16:12.

## Ponto adicional

Uma batida fora do intervalo da volta e fora do intervalo da saída não fecha esses pontos. Ela fica como **ponto adicional**.

Saiu às 12:00 e bateu de novo às 12:30: isso é adicional. Os avisos das 12:58, 13:00 e 13:02 continuam. O mesmo vale para uma batida depois do intervalo da volta e antes do aviso da saída, por exemplo 13:10.

Só a batida dentro do intervalo da volta fecha a volta. Só a batida dentro do intervalo da saída fecha a saída. A hora da saída do expediente não muda.

O detector não sabe quem passou o rosto no Clock In. O ponto de outra pessoa no mesmo celular, fora do intervalo, aparece como adicional e não rouba a sua volta.
