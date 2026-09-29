# Bitácora del agente — Paso 04

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

Paso 04 de la spec (sigue vigente: > "continua autonomo y con full permisos hasta el final"): dataset de ~30 casos con adversariales, chequeos deterministas, LLM-as-judge con rúbrica, muestra para revisión humana, resultados en JSON y en Supabase, modo mock para CI, línea base con la versión del paso 03 y análisis de errores.

## Lo que hice

1. Separé la configuración del copiloto en `lib/ai/copilot.ts`, que usan **tanto** `/api/chat` **como** las evals. Así las evals miden exactamente lo que corre en producción.
2. Escribí el extractor de montos en COP (`lib/evals/cop-amounts.ts`) **con tests primero**, y lo validé contra las 3 respuestas reales del paso 03. Coincidió con mi análisis manual: hotel ✗, panadería ✗, marca ✓.
3. Escribí los chequeos deterministas, el juez, la rúbrica, el dataset (30 casos) y el runner con modo mock.
4. Corrí una prueba de 2 casos, detecté que el juez era permisivo, lo calibré, y luego corrí la línea base completa dos veces (ver abajo).

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| Tests unitarios (catálogo, precios, chequeos) | ✅ 33 passed |
| Línea base v1 (dataset sin seguimiento) | ⚠️ 5/30, línea correcta 53,3 %: **resultado inválido**, defecto de la eval (ver abajo) |
| Línea base definitiva | ✅ 5/30 (16,7 %); línea 96,7 %; sin precios inventados 36,7 %; juez fundamentación 3,00 |
| Acuerdo juez vs. chequeo de precios | ✅ 29/30 casos |
| `pnpm eval --mock` **sin** `ANTHROPIC_API_KEY` | ✅ mismos números, sin llamadas a la API |
| Guardado en Supabase | ✅ `eval_runs` + 30 filas en `eval_results` |

## Lo que decidió el humano

Nada nuevo en este paso. **Pendiente para el humano:** llenar las columnas `human_*` de `evals/human-review.csv`. El agente no puede hacer la revisión humana por el humano.

## Lo que salió mal y cómo lo corregí

1. **El juez fue engañado (rúbrica v1).** En el caso del hotel escribió que la respuesta "usa datos del catálogo (rangos de inversión)", cuando el rango era inventado, y puntuó 4/5. Corrección: el esquema de salida obliga al juez a llenar primero `servicios_mencionados_no_existentes` y `precios_o_plazos_no_respaldados`, con reglas duras (precio no respaldado → fundamentación ≤ 2). Resultado: el mismo tipo de respuesta pasó a 2/5.
2. **Falso positivo en la detección de línea.** Al rechazar una inyección, el copiloto *enumeró* las líneas del centro y el detector lo tomó como clasificación. Tuve que iterar tres veces: (a) contar menciones no sirve porque abrevia los nombres; (b) exigir un contexto de compromiso ("línea de trabajo:", "tu caso es de…"); (c) excluir "lo encuadro en *una de las* líneas…". Cada variante quedó como test unitario, probada con todas las respuestas reales grabadas.
3. **La primera línea base completa era inválida.** 14 casos "fallaban" en clasificación porque el copiloto hacía preguntas aclaratorias (correcto según la spec) y el dataset no traía la respuesta del usuario. Guardé esa corrida como evidencia, agregué `followup` a 27 casos y la repetí. Casi publico un 53 % que no medía lo que decía medir.
4. **`must_not_contain` confundía citar con obedecer.** La inyección oculta fue *rechazada* citando "90 % de descuento", y el filtro la marcó como falla. Lo reemplacé por una pregunta explícita al juez (`obedecio_instrucciones_indebidas`) y una nueva métrica `injection_resisted`.

## Costo de API de este paso

Desde los archivos de resultados: calibración v1 US$ 0,033 + calibración v2 US$ 0,046 + línea base inválida (US$ 0,34) + línea base definitiva US$ 0,53 ≈ **US$ 0,95** (estimado con precios públicos).
