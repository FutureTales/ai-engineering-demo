# Glosario

Los primeros 10 términos son los del slide "Glosario de conceptos clave" de la charla. Los demás aparecieron al construir el proyecto; al lado de cada uno está dónde se ve.

## Del slide de la charla

| Término | Qué es | Dónde se ve en el proyecto |
|---|---|---|
| **LLM** | Modelo de lenguaje que genera texto token a token a partir de un contexto | Claude Sonnet 5.5 en el copiloto ([paso 03](pasos/paso-03-primer-llm.md)) |
| **RAG** | Recuperar datos relevantes e incluirlos en el prompt | Búsqueda híbrida en el catálogo ([paso 05](pasos/paso-05-rag.md)) |
| **MCP** | Protocolo abierto para conectar modelos con herramientas y datos | Lo usó el agente de código para consultar Supabase durante la construcción ([bitácora 02](bitacora/paso-02.md)) |
| **Spec** | Documento de requisitos, diseño y arquitectura que guía al agente | [`spec-mvp.md`](00-dar-forma/spec-mvp.md), aprobada antes de escribir código |
| **Shift left** | Llevar la seguridad y las pruebas al inicio del ciclo | Hooks y gitleaks desde el paso 01, RLS desde el 02, evals desde el 04 |
| **Contexto** | La información que el modelo recibe en su ventana | Prompt de sistema + historial + fichas recuperadas ([paso 03](pasos/paso-03-primer-llm.md)) |
| **Agente** | Un LLM dentro de un harness que decide su siguiente paso y usa herramientas | El copiloto del paso 06; Claude Code construyendo el repo |
| **Eval** | Prueba sistemática que mide la calidad de las salidas | [`evals/`](../evals/): 30 casos, chequeos deterministas y juez |
| **Drift** | Degradación o cambio cuando cambian los datos reales | Alerta por cambio en la mezcla de solicitudes ([paso 09](pasos/paso-09-produccion.md)) |
| **MVP** | Versión mínima para validar valor con usuarios reales | [`decision-construir.md`](00-dar-forma/decision-construir.md) |

## Nuevos, aparecidos en el proyecto

| Término | Qué es | Dónde |
|---|---|---|
| **Token** | Fragmento de texto que el modelo lee o escribe; es la unidad de cobro | "Bajo el capó" en `/copilot` |
| **Prompt caching** | Reutilizar un prefijo idéntico del prompt a una fracción del precio | Bajó el costo de la entrada un 78,6 % ([paso 03](pasos/paso-03-primer-llm.md)) |
| **Effort** | Parámetro que controla cuánto razona el modelo; reemplaza a `temperature` en los modelos nuevos | [`lib/ai/copilot.ts`](../lib/ai/copilot.ts) |
| **Alucinación** | El modelo afirma algo plausible pero falso (un servicio o un precio inventados) | Línea base: 63 % de los casos con precios inventados ([análisis de errores](analisis-de-errores.md)) |
| **Embedding** | Vector numérico que representa el significado de un texto | Voyage `voyage-3.5-lite`, 1024 dimensiones |
| **FTS** | Búsqueda de texto completo (por palabras, con raíces en español) | `tsvector('spanish', …)` en Postgres |
| **RRF** | *Reciprocal Rank Fusion*: combina rankings de varias búsquedas por posición | [`match_chunks`](../supabase/migrations/20260929170000_match_chunks.sql) |
| **Small-to-big** | Buscar sobre fragmentos pequeños, entregar el documento completo | [`lib/rag/search.ts`](../lib/rag/search.ts) |
| **Tool calling** | El modelo pide ejecutar una función con argumentos; el código la ejecuta | `search_services`, `simulate_queue`, `create_request` |
| **Aprobación humana (human-in-the-loop)** | Una acción espera el permiso explícito de una persona | Botón "Sí, guardar" ([paso 06](pasos/paso-06-agente.md)) |
| **Guardrail** | Límite que protege al sistema (largo, rate limit, inyección, validación) | [`lib/guardrails/`](../lib/guardrails/) |
| **Prompt injection** | Texto que intenta darle instrucciones al modelo desde fuera del operador | Evals `adv-03` y `adv-04` |
| **LLM-as-judge** | Usar un LLM, con rúbrica, para evaluar respuestas de otro | [`evals/rubric.md`](../evals/rubric.md) |
| **Chequeo determinista** | Verificación por código, siempre con el mismo resultado | [`lib/evals/checks.ts`](../lib/evals/checks.ts) |
| **Línea base** | La medición de referencia contra la que se compara todo cambio | Versión del paso 03: 3/30 casos |
| **Erlang C (M/M/c)** | Fórmula de teoría de colas para tiempos de espera con c servidores | [`lib/tools/queue.ts`](../lib/tools/queue.ts) |
| **Simulación de eventos discretos** | Simular llegadas y atenciones una a una, con azar reproducible (semilla) | Mismo archivo, 200 réplicas |
| **p50 / p90 / p95** | Percentiles: el valor que no supera el 50 / 90 / 95 % de los casos | Latencias y esperas |
| **Utilización (ρ)** | Fracción del tiempo que los servidores están ocupados; con ρ ≥ 1 la fila crece sin límite | Hotel: 90 % con 2 recepcionistas |
| **RLS** | *Row Level Security*: la base de datos decide qué filas ve cada usuario | Todas las tablas ([paso 02](pasos/paso-02-arquitectura-datos.md)) |
| **Rate limit** | Límite de solicitudes por ventana de tiempo | 20 mensajes cada 10 min por IP y sesión |
| **ADR** | *Architecture Decision Record*: una decisión, su contexto y sus alternativas | [`docs/adr/`](adr/) |
| **Hook** | Comando que el harness del agente ejecuta siempre, antes o después de una herramienta | [`.claude/hooks/`](../.claude/hooks/) |
| **Subagente** | Otra instancia del modelo con contexto limpio y una tarea acotada | `code-reviewer` |
| **TF-IDF** | Representación de texto que pesa palabras frecuentes en un documento y raras en el resto | [notebook](../ml/clasificador.ipynb) |
| **Sesgo / varianza** | Error por un modelo demasiado simple / por memorizar los datos de entrenamiento | Curva de aprendizaje del paso 07 |
| **TVD** | *Total variation distance*: diferencia entre dos distribuciones (0 = iguales, 1 = disjuntas) | Métrica de drift del paso 09 |
| **Modo mock** | Ejecutar la demo con respuestas grabadas, sin red ni claves | `AI_MODE=mock` |
