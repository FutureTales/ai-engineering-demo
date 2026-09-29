# Bitácora del agente — Paso 03

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

Continuar de forma autónoma (> "continua autonomo y con full permisos hasta el final") con el paso 03 de la spec: chat con streaming, un solo prompt de sistema, panel "Bajo el capó", documentar fundamentos de LLM, activar y medir el caché, y guardar 3 ejemplos reales de la limitación.

## Lo que hice

1. **Verifiqué antes de escribir código**, en este orden:
   - Cargué la referencia de la API de Claude del agente. Su tabla de precios estaba fechada el 2026-06-24 y **no incluía `claude-sonnet-5-5`**.
   - Consulté `GET /v1/models/claude-sonnet-5-5`: `created_at` 2026-09-28 (**el modelo salió el día anterior**), contexto 1M, salida 128K, thinking solo adaptativo.
   - Leí la página oficial de precios: Sonnet 5.5 US$ 2 / 10 por millón (entrada/salida), lectura de caché US$ 0,20; Haiku 4.5 US$ 1 / 5.
   - Leí la documentación del AI SDK **que viene instalada** en `node_modules/ai/docs/` (v7), no la que el agente recordaba.
2. Escribí `lib/ai/models.ts` (IDs + precios + cálculo de costo), el prompt `v1-solo-prompt`, el endpoint, la UI del chat y el panel "Bajo el capó".
3. Agregué telemetría por turno a `interactions` con `after()` de Next.js.
4. Escribí `scripts/probe-chat.ts` para guardar conversaciones reales como evidencia, y `scripts/experiments/cache-and-latency.ts`.
5. Probé en el navegador con Playwright (`scripts/screenshots.ts --chat`).

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| `pnpm typecheck` · `pnpm lint` | ✅ |
| Primera llamada real al endpoint (hotel) | ✅ 935 tokens **escritos** en caché, TTFT 5,6 s, total 12,3 s, US$ 0,0164 |
| Llamadas siguientes | ✅ 935 tokens **leídos** de caché |
| Experimento de caché (9 llamadas) | ✅ guardado en `docs/evidencia/paso-03/experimento-cache-latencia.json` |
| `temperature` en Sonnet 5.5 | ❌ rechazado: "`temperature` is deprecated for this model" (esperado; documentado) |
| Chat en el navegador (Playwright) | ✅ respuesta renderizada con Markdown, panel "Bajo el capó" con datos reales |
| 3 ejemplos de la limitación | ✅ hotel y panadería inventaron precios; la startup se negó a inventar |

## Lo que decidió el humano

Nada nuevo en este paso: autonomía total.

## Lo que salió mal y cómo lo corregí

1. **El endpoint devolvía un error genérico y no se veía la causa.** El mensaje amable para el usuario ocultaba el error real. Agregué `console.error` en el servidor y apareció: `AI_InvalidPromptError: System messages are not allowed in the prompt or messages fields. Use the instructions option instead.` En el AI SDK v7 el prompt de sistema va en `instructions`. Incluso la documentación del proveedor de Anthropic (en el mismo paquete) todavía muestra el patrón anterior. Solución: `instructions` acepta un `SystemModelMessage` con `providerOptions`, así que el caché se conservó.
2. **Riesgo de carrera en los metadatos:** la parte `finish` del stream podía llegar antes que `onFinish`. Calculé los metadatos desde `part.totalUsage` en vez de depender del orden.
3. **Supuse que el modelo "siempre inventa"** (así lo decía la spec). Los datos reales muestran algo más interesante: a veces se abstiene. Lo documenté tal cual; la variabilidad es el mejor argumento para las evals.
4. **La captura de pantalla completa** muestra el formulario fijo encima del panel "Bajo el capó". Es un efecto de la captura de página completa, no de la app; en el navegador el formulario queda abajo.

## Costo de API de este paso

- Suma de `costUsd` de las llamadas guardadas en `docs/evidencia/paso-03/`: **US$ 0,138** (calculado con `jq` sobre los archivos).
- Más 4 pruebas manuales no guardadas (curl y navegador): del orden de US$ 0,05 según sus metadatos.
- Son **estimaciones** con los precios públicos; el total real de la construcción se reporta al final.
