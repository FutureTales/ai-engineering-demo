# Métricas

> **Regla de honestidad:** en este documento hay **objetivos**, no resultados. Los resultados reales se registran en `evals/results/`, en la tabla `interactions` y en los docs de cada paso. Si un objetivo no se alcanza, se reporta tal cual.

## Métrica norte

> **% de conversaciones que terminan en una pre-propuesta bien encuadrada.**

"Bien encuadrada" = línea correcta + al menos un servicio pertinente citado + sin precios fuera de catálogo. En el MVP se mide con evals (casos conocidos) y con revisión humana de una muestra.

## Métricas de calidad del asistente (evals, paso 04)

| Métrica | Tipo | Cómo se mide | Objetivo MVP |
|---|---|---|---|
| Línea correcta | Determinista | Comparar con `expected_line` del dataset | ≥ 85 % |
| Servicio esperado mencionado | Determinista | Buscar el servicio esperado en la respuesta | ≥ 80 % |
| Herramienta usada cuando corresponde | Determinista | Registro de tool calls | ≥ 90 % |
| Números coinciden con la simulación | Determinista | Comparar cifras del texto con la salida de la herramienta | 100 % |
| Sin precios fuera de catálogo | Determinista | Buscar montos en COP y validarlos contra el catálogo | 100 % |
| Casos adversariales resistidos | Determinista + juez | Fuera de tema, injection, datos personales | ≥ 90 % |
| Pertinencia, fundamentación, claridad, tono | LLM-as-judge (rúbrica) | `evals/rubric.md`, escala 1–5 | promedio ≥ 4 |
| Acuerdo juez–humano | Humano en el ciclo | `evals/human-review.csv` | se reporta, sin objetivo |

## Costo y latencia (telemetría, pasos 03 y 09)

| Métrica | Objetivo MVP | Nota |
|---|---|---|
| Costo por conversación | < USD 0,10 | Estimado con tokens reales × precio por modelo en `lib/ai/models.ts` |
| Latencia al primer token p50 | < 3 s | |
| Latencia de turno completo p95 | < 20 s | Incluye herramientas y RAG |
| Tasa de errores | < 2 % | Errores de API o de herramientas por turno |

Los objetivos de costo y latencia son **estimaciones iniciales** que se revisan con datos reales en el paso 03.

## Métricas de negocio (lo que le importaría al centro)

| Métrica | Hoy (proceso manual) | Con el copiloto |
|---|---|---|
| Tiempo hasta el primer análisis | No medido en esta demo (en la entrevista simulada: ~2 semanas) | Minutos (una conversación) |
| % de solicitudes que llegan con datos completos | No medido | Se medirá en un piloto |
| Solicitudes atendidas por coordinador | No medido | Se medirá en un piloto |

> En una demo con datos ficticios **no podemos** medir métricas de negocio reales. Lo decimos explícitamente y proponemos medirlas en el piloto (ver `docs/memo-stakeholders.md`).

## Métricas operativas del panel (pasos 08–09)

- Solicitudes por línea (semana actual vs. línea base) → alerta de drift.
- Tiempo medio de conversación.
- % de conversaciones con pre-propuesta.
- Uso de herramientas por conversación.
