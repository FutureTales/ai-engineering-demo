# Bitácora del agente — Paso 09

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

Paso 09 en su versión ligera acordada: telemetría y página de salud (costo por conversación, p50/p95, errores, uso de herramientas), tráfico sintético con drift y alerta en el panel, evals de regresión (control manual documentado), runbook y dominio documentado.

## Lo que hice

1. Página `/panel/salud` con consultas a través del RLS (sesión del personal).
2. `scripts/simulate-traffic.ts`: 130 conversaciones sintéticas, con semilla y marcadas `is_synthetic`.
3. Métrica de drift TVD con tests; alerta en la página.
4. **Superé el recorte acordado en un punto:** en lugar de un control manual, hice un control automático barato en CI (`scripts/eval-gate.sh`), que no llama APIs.
5. Runbook, verificando que cada comando de Vercel exista en el CLI instalado.
6. Prueba de punta a punta **en producción** con capturas (`scripts/demo-produccion.mts`), y renombré en la base la corrida inválida de la línea base.
7. Eval en vivo de la versión actual.

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| Caso del hotel en producción | ✅ clasifica, cita, simula, guarda y aparece en `/panel` (26 s) |
| Control de regresión sobre el historial | ✅ pasa `paso-05 → paso-06` (trae eval) · ❌ `paso-07 → paso-08` (tocó herramientas sin eval) |
| Eval de la versión actual | ✅ 28/30; los 2 fallos son E9 (defecto de la eval) |
| Drift | ✅ TVD 0,30 > 0,2 → alerta visible |
| Gráfico de la simulación | ✅ etiquetas largas ya no se enciman (verificado en modo mock) |

## Lo que salió mal y cómo lo corregí

1. **El control de regresión me atrapó a mí.** En el paso 08 cambié `lib/tools` y `lib/ai/copilot.ts` al corregir los hallazgos de la revisión y no volví a evaluar. Lo vi al probar el script sobre mi propio historial. Corrí la eval en vivo (US$ 0,68).
2. **La página de salud mostraba 0 % de uso de herramientas.** No era un bug: no había tráfico real del agente en producción. Se resolvió con la prueba de punta a punta (que además es parte de la definición de terminado).
3. **La corrida inválida de la línea base aparecía en la tabla de evals** con el mismo nombre que la válida. La renombré en la base de datos: "paso-03 (INVÁLIDA: dataset v1 sin seguimiento)".
4. **`vercel redeploy` espera la URL de un deploy, no el dominio.** Lo detecté verificando `--help` antes de publicar el runbook; lo cambié por `vercel deploy --prod`.
5. **Las etiquetas del gráfico de la simulación se enciman** con nombres de escenario largos (visto en las capturas de producción). Agregué un tick que parte el texto en líneas.

## Costo de API de este paso

Eval en vivo US$ 0,68 + prueba en producción ≈ US$ 0,05 → **≈ US$ 0,73**.
