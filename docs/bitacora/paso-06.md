# Bitácora del agente — Paso 06

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

Paso 06 de la spec (autonomía total vigente): herramientas con zod (`search_services`, `simulate_queue` con Erlang C y simulación de eventos discretos, `create_request` solo tras confirmación), loop de agente con máximo de pasos, tarjetas de herramientas y gráfico Recharts, guardrails (largo, inyección, fuera de tema, validación, rate limit por IP y sesión, tope diario), `AI_MODE=mock` como plan B y evals con comparación.

## Lo que hice

1. **Leí la documentación instalada del AI SDK v7** para la aprobación de herramientas: `toolApproval` en `streamText` (el antiguo `needsApproval` está obsoleto), estados `approval-requested` en la UI y `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses`.
2. Escribí `simulate_queue` **con tests antes de conectarla** al agente: fórmula de Erlang C verificada a mano (P0 = 1/19 para el hotel), caso M/M/1 cerrado, convergencia de la simulación a Erlang C en horizonte largo, determinismo con semilla.
3. Herramientas, loop (`isStepCount(6)`), prompt `v3-agente`, guardrails, UI y modo mock (modelo simulado que reproduce los streams grabados + herramientas reales en modo offline).
4. Tests e2e con Playwright en modo mock, con todas las claves en blanco, en escritorio y celular.
5. Eval completa del agente con búsqueda híbrida, en segundo plano (lenta por el límite de Voyage), mientras avanzaba el paso 07.

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| Tests unitarios | ✅ 52 passed (17 de la simulación) |
| Tests e2e, modo mock, **sin claves** (escritorio + celular) | ✅ 4 passed |
| Eval del agente | ✅ 29/30; simulación 4/5; cifras = herramienta 4/4; sin precios inventados 100 % |
| Contador de rate limit atómico (3 golpes, máx. 2) | ✅ exactamente 1 rechazado |
| Rate limit en la ruta (`RATE_LIMIT_MAX_MESSAGES=1`) | ✅ HTTP 429 + `Retry-After` |
| Tope diario (`DAILY_CONVERSATION_CAP=1`) | ✅ HTTP 429 con mensaje en español |
| Grabación del mock | ✅ 4 pasos del modelo, sin llamadas repetidas |

## Lo que decidió el humano

Nada nuevo.

## Lo que salió mal y cómo lo corregí

1. **El historial perdía las llamadas a herramientas.** Al grabar el mock, en el turno 2 el modelo escribió: *"En mi mensaje anterior te di cifras de simulación … sin haber consultado las herramientas. No debí hacerlo."* Sí las había consultado, pero yo agregaba al historial `result.response.messages`, que en v7 es un campo obsoleto con solo metadatos. El correcto es `result.responseMessages` (todos los pasos). Afectaba al script de grabación y al runner de evals; la UI no (usa `useChat`). *El modelo "confesando" un error que no cometió fue la pista.*
2. **Bug en celular encontrado por el e2e.** El botón "Enviar" no se podía pulsar: `<p> … intercepts pointer events`. Primero supuse un problema de `z-index` y lo "arreglé" sin efecto. Medí el layout: la página medía **972 px** de ancho en un teléfono de 412, por unas etiquetas (badges) que no hacían salto de línea. Solución: `flex-wrap` + `whitespace-normal`, y un test de regresión de desborde horizontal. *Lección: medir antes de arreglar.*
3. **Un `sed` no aplicó** porque prettier había reordenado las clases de Tailwind. Lo detecté con `grep -c` (0 coincidencias) y lo repetí con la cadena real.
4. **"Cola máxima 12 con 4 recepcionistas"** parecía un bug de la simulación. Un histograma mostró que era el peor de 200 días simulados (la mayoría: 1–3). Cambié la métrica a "día típico" (mediana) y "día malo" (p90).
5. **La primera prueba del rate limit "falló"** porque los dos mensajes cayeron en ventanas fijas distintas (17:30 y 17:40). No era un bug sino la compensación de las ventanas fijas; quedó documentada.
6. **Next 16 no permite dos `next dev` en la misma carpeta:** el servidor de Playwright no arrancaba mientras otro seguía vivo. Detuve el anterior.
7. **Tres cifras mal en el primer borrador del doc** ("27 tests", "300 líneas" y un costo sin medir). Las verifiqué antes de publicar: 17 tests, 244 líneas, US$ 0,062.
8. **El único caso que falla en la eval es un defecto de la eval** (el seguimiento solo se envía si el copiloto no clasificó). Lo documenté en vez de re-calificar solo esta versión.

## Costo de API de este paso

Eval del agente US$ 0,72 + prueba de 3 casos US$ 0,12 + grabación del mock (dos veces) ≈ US$ 0,12 + pruebas de la ruta ≈ US$ 0,01 → **≈ US$ 0,97** (estimado con precios públicos).
