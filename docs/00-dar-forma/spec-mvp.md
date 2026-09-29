# Especificación del MVP

> Esta spec la aprueba el humano **antes** de construir (punto de control b). Los criterios de aceptación se convierten en evals y tests en los pasos siguientes.

## Requisitos funcionales

| ID | Requisito | Paso |
|---|---|---|
| RF-01 | El copiloto hace **como máximo 3** preguntas aclaratorias antes de recomendar | 03–06 |
| RF-02 | Clasifica el caso en exactamente una línea: `quality_assurance`, `business_innovation` o `process_design` | 04–06 |
| RF-03 | Recomienda 1–2 servicios del catálogo y **cita** la ficha de origen | 05 |
| RF-04 | Si el problema es de filas o capacidad, llama `simulate_queue` con uno o varios escenarios y muestra tabla y gráfico | 06 |
| RF-05 | Solo tras confirmación explícita del usuario, guarda la solicitud con `create_request` y muestra una tarjeta de pre-propuesta | 06 |
| RF-06 | `/panel` (login con allowlist) lista solicitudes filtrables por línea y estado, con detalle | 08 |
| RF-07 | `/panel` muestra KPIs y la salud del asistente (evals, costo, latencia, errores, uso de herramientas) | 08–09 |
| RF-08 | `/panel` muestra una alerta de drift simulado (distribución de líneas vs. línea base) | 09 |
| RF-09 | La UI muestra un panel "Bajo el capó" con modelo, tokens, costo estimado y latencia de cada turno | 03 |
| RF-10 | Con `AI_MODE=mock` la app funciona sin claves ni red, reproduciendo el caso del hotel | 06 |

## Requisitos no funcionales

| ID | Requisito | Cómo se verifica |
|---|---|---|
| RNF-01 | **Nunca** menciona precios que no estén en el catálogo | Eval determinista |
| RNF-02 | Los números de la simulación en el texto coinciden con la salida de la herramienta | Eval determinista |
| RNF-03 | Rechaza con amabilidad lo fuera de tema y resiste prompt injection | Evals adversariales |
| RNF-04 | Rate limit: 20 mensajes cada 10 min por IP/sesión; tope diario configurable (`DAILY_CONVERSATION_CAP`) | Tests + prueba manual |
| RNF-05 | Calidad medida: puntaje de evals registrado por versión | `evals/results/` y tabla `eval_runs` |
| RNF-06 | Latencia: primer token visible en < 3 s en p50 (objetivo) | Telemetría |
| RNF-07 | Costo por conversación dentro del objetivo de [metricas.md](metricas.md) | Telemetría |
| RNF-08 | RLS en todas las tablas; la anon key no puede leer `requests` | Prueba en paso 08 |
| RNF-09 | Sin secretos en el repo | gitleaks en CI |
| RNF-10 | Accesible: contraste suficiente, navegable con teclado | Chequeo básico en e2e |
| RNF-11 | Aviso visible: "demo educativa, datos ficticios" | Footer + README |

## Historias de usuario

**HU-1 (Marcela, MIPYME).** Como dueña de un hotel, quiero contar mi problema con mis palabras y recibir en la misma conversación una recomendación concreta, para no esperar semanas.
- *Dado* que describo filas de 40 min con 2 recepcionistas, 18 llegadas/h y 6 min por check-in,
- *cuando* termino de responder las preguntas del copiloto,
- *entonces* el caso queda en `process_design`, se recomienda el servicio de simulación de operaciones con cita y veo una simulación con 2, 3 y 4 recepcionistas.

**HU-2 (Marcela).** Como dueña, quiero comparar alternativas (más personal vs. check-in digital), para decidir cuál me conviene.
- *Entonces* la simulación incluye el escenario de check-in digital (servicio de 3 min) y el texto usa los mismos números que la herramienta.

**HU-3 (Marcela).** Como dueña, quiero una pre-propuesta con alcance y rango de inversión, para saber cuánto costaría.
- *Dado* que confirmo que quiero guardar la solicitud,
- *entonces* veo una tarjeta con problema, línea, servicios, alcance, rango en COP (del catálogo) y siguiente paso.
- *Y si no confirmo*, no se guarda nada.

**HU-4 (Andrés, coordinador).** Como coordinador, quiero ver las solicitudes ya encuadradas en un panel, para priorizar sin volver a entrevistar.
- *Entonces* en `/panel` veo la solicitud del hotel con todos sus campos, y un usuario sin login no puede verla.

**HU-5 (Andrés).** Como coordinador, quiero saber qué tan bien funciona el asistente y cuánto cuesta, para decidir si lo usamos en un piloto.
- *Entonces* el panel muestra el último puntaje de evals, costo por conversación y latencia p50/p95.

**HU-6 (visitante malicioso).** Como alguien que escanea el QR e intenta abusar, no debo poder gastar la cuota de API ni extraer instrucciones.
- *Entonces* el rate limit me detiene y los intentos de prompt injection no cambian el comportamiento.

## Criterios de aceptación del MVP (resumen)

1. El caso del hotel funciona **en producción** de principio a fin (HU-1, HU-2, HU-3, HU-4).
2. El mismo caso funciona en **modo mock** sin claves.
3. Evals ejecutadas en las versiones de los pasos 03, 05 y 06, con resultados guardados.
4. CI en verde y gitleaks sin hallazgos.
5. RLS y rate limit probados.

## Supuestos

- Las tarifas del catálogo son ficticias y se expresan en rangos de COP.
- El modelo de colas M/M/c es suficiente para una primera aproximación (llegadas y servicios exponenciales). Sus límites se documentan en el paso 06.
