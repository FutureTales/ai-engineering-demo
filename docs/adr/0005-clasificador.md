# ADR 0005 — Clasificador de líneas de trabajo: LLM en el agente, ML clásico para triage masivo

**Estado:** aceptada (paso 07), basada en [`ml/results/comparacion.json`](../../ml/results/comparacion.json)

## Contexto

El copiloto tiene que encuadrar cada caso en una de 3 líneas. Comparamos, **en el mismo conjunto de prueba** (36 solicitudes sintéticas, 12 por línea), un modelo clásico y un LLM.

| Modelo | Accuracy | F1 macro | Costo por 1.000 | Latencia p50 |
|---|---|---|---|---|
| TF-IDF + regresión logística | 91,7 % (33/36) | 0,916 | ≈ US$ 0 (cómputo local) | 0,6 ms |
| Claude Haiku 4.5 zero-shot | 86,1 % (31/36) | 0,861 | US$ 0,30 | 613 ms |
| Claude Haiku 4.5 few-shot (6 ejemplos) | **97,2 %** (35/36) | 0,972 | US$ 1,02 | 528 ms |

Otros datos del notebook ([`ml/clasificador.ipynb`](../../ml/clasificador.ipynb)):
- El modelo clásico tiene **100 %** en entrenamiento y la validación cruzada **sube de 64 % a 90 %** al pasar de 20 a 67 ejemplos de entrenamiento (5 particiones sobre los 84): **varianza alta**, y más datos lo mejorarían.
- Con 36 casos de prueba, **1 caso = 2,8 puntos**. La diferencia TF-IDF vs. few-shot es de 2 casos: indicativa, no concluyente.
- Los datos son **sintéticos**. En solicitudes reales, con más ruido y ambigüedad, los números pueden cambiar.

## Decisión

1. **En la conversación, clasifica el LLM del agente** (Sonnet 5.5, dentro del mismo turno). No hace falta un clasificador separado: el agente ya lee el problema completo, puede preguntar cuando es ambiguo y el costo de clasificar va incluido en el turno. Las evals del paso 06 miden su línea correcta.
2. **Para triage masivo o monitoreo, el modelo clásico.** Clasificar miles de solicitudes (por ejemplo, un buzón de correos acumulado, o etiquetar el tráfico para detectar *drift* en el paso 09) cuesta prácticamente cero y responde en menos de 1 ms. Con la precisión medida (91,7 %), sirve para estadísticas agregadas, no para decisiones individuales.
3. **Haiku few-shot** queda como opción si hiciera falta un clasificador independiente y preciso a bajo costo por unidad (US$ 1 por cada 1.000).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Solo ML clásico, también en la conversación | No sabe preguntar, no maneja casos fuera de tema ni inyecciones, y con 84 ejemplos sintéticos todavía tiene varianza alta |
| Haiku zero-shot como clasificador separado | Fue el peor de los tres (86,1 %) y agrega latencia y costo a cada turno |
| Afinar (fine-tuning) un modelo | Sin datos reales suficientes; desproporcionado para 3 clases |

## Consecuencias

- ✅ La decisión se revisa cuando haya **datos reales**: el plan es reentrenar el clasificador clásico con solicitudes reales etiquetadas por los coordinadores (ver [`roadmap-v2.md`](../roadmap-v2.md)).
- ⚠️ El clasificador clásico hereda el sesgo del generador sintético (los textos los escribió Claude). Por eso no se usa para decisiones individuales.
