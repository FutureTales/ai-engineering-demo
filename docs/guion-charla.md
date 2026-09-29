# Notas del presentador: "AI Engineering Skills Map" + caso práctico

> Este documento es el libreto de quien presenta el proyecto en una charla. Si vienes a aprender, empieza por el [README](../README.md) y los [pasos](pasos/).

**Duración:** ~60 minutos (25 de mapa conceptual + 30 de caso práctico + 5 de preguntas).
**Deck:** [`presentacion/AI_Engineering_Skills_Caso_Practico.pptx`](../presentacion/AI_Engineering_Skills_Caso_Practico.pptx) (31 slides; el caso práctico va del 17 al 30).
**Lugar:** Unicolombo, Cartagena.

## Antes de empezar (checklist, 30 minutos antes)

- [ ] Abrir en pestañas: https://innova-copilot.vercel.app/copilot · https://innova-copilot.vercel.app/panel (con sesión iniciada) · el repo en GitHub · una terminal en la carpeta del repo.
- [ ] La app pública **no tiene clave del modelo** (cada quien usa la suya). Crear una clave **dedicada para la charla**, con límite de gasto, en console.anthropic.com. En `/copilot` → "Usar mi clave" → pegarla. Probar el caso del hotel una vez (~US$ 0,05). Borrar esa clave después de la charla.
- [ ] Sin pegar la clave, la app está en **modo demo**: sirve como plan B inmediato.
- [ ] Terminal lista con el plan B ya compilado: `AI_MODE=mock ANTHROPIC_API_KEY= pnpm dev` en otra pestaña (no lo inicies todavía si vas a usar producción).
- [ ] Límite de gasto mensual configurado en console.anthropic.com.
- [ ] Zoom del navegador al 125 % para que se lea desde el fondo.
- [ ] **Hacer la demo en vivo desde la red del celular (hotspot), no desde el Wi-Fi del lugar.** Toda la sala sale a internet con la misma IP; si mucha gente usa el QR a la vez, el límite por IP (200 mensajes cada 10 min) podría alcanzarse.
- [ ] Copiar al portapapeles el mensaje del hotel (abajo).

**Mensaje exacto del hotel** (o usar el botón "Hotel con filas en el check-in"):

> Tengo un hotel boutique de 24 habitaciones en Getsemaní, el Hotel Brisas de Getsemaní. En temporada alta (diciembre y enero) se forman filas de hasta 40 minutos en el check-in entre las 2 y las 5 de la tarde. Tenemos 2 recepcionistas. Llegan unos 18 huéspedes por hora en el pico y cada check-in toma unos 6 minutos. Los huéspedes se quejan en las reseñas. ¿Qué me recomiendan?

**Segundo mensaje (para guardar):**

> Sí, guárdala por favor. Soy Marcela Pérez, del Hotel Brisas de Getsemaní.

---

## Parte 1 · El mapa (slides 1–16, ~25 min)

| Tiempo | Slides | Qué decir (idea central) |
|---|---|---|
| 0:00 | 1–2 | Presentación. El mapa sale de analizar más de 10.000 ofertas de empleo y entrevistas (serie de Andrew Ng en *The Batch*) |
| 0:03 | 3–4 | "AI Engineering" es un conjunto de habilidades, no un cargo. Los 4 pilares + la base común |
| 0:06 | 5–7 | Pilar 1. Detenerse en el slide 7: **construir → medir → analizar errores → decidir**. "Hoy van a ver este ciclo aplicado cuatro veces" |
| 0:11 | 8–9 | Pilar 2: las compensaciones. "Si no sabes que existen, el agente las decide por ti" |
| 0:15 | 10–12 | Pilar 3: planificar, ejecutar, desplegar con agentes. "Todo el caso práctico lo construyó un agente de código, y les voy a mostrar sus errores" |
| 0:19 | 13–14 | Pilar 4: decidir **qué** construir |
| 0:22 | 15–16 | Glosario rápido (no leerlo todo) y aprendizaje continuo. Transición: *"Ahora, todo esto junto en un proyecto."* |

## Parte 2 · Caso práctico (slides 17–30, ~30 min)

| Tiempo | Slide | Qué hacer / decir | Demo |
|---|---|---|---|
| 0:25 | 17 | "Las competencias del mapa no se aprenden por separado. Aparecen juntas." | — |
| 0:26 | 18 | El problema y el caso del hotel. **¿Por qué no solo IA?** | — |
| 0:28 | 19 | Los 11 pasos. "Cada uno es un tag: pueden volver a cualquier punto." | Mostrar en GitHub la lista de tags |
| 0:30 | 20 | Arquitectura. "En producción desde el paso 02, antes de tener IA." | — |
| 0:31 | 21 | Paso 03: **el modelo inventa**. COP 6–12 M frente a 8–25 M del catálogo | Opcional: `git checkout paso-03-primer-llm` y mostrar `docs/evidencia/paso-03/01-hotel.json` |
| 0:34 | 22 | **Paso estrella: evals.** 3 → 24 → 29 de 30. La eval también tuvo bugs | En la terminal: `pnpm eval --mock` (tarda segundos, sin costo) |
| 0:38 | 23 | RAG: "No cambiamos el modelo, cambiamos lo que sabe." FTS 6/8 vs. híbrido 8/8 en paráfrasis | — |
| **0:40** | **24 → app** | **CAMBIAR A LA APP EN VIVO.** `/copilot` → botón del hotel. Señalar "Buscando en el catálogo…" y "Simulando…". Abrir **"Bajo el capó"** (tokens, costo). *"El LLM no calcula: decide quién calcula."* | **Demo en vivo (3 min)** |
| 0:44 | 25 + app | Escribir el segundo mensaje → aparece **"Sí, guardar"** → pulsarlo → tarjeta de pre-propuesta. Luego `/panel`: la solicitud ya está ahí | **Demo en vivo (2 min)** |
| 0:47 | 26 | ML clásico vs. LLM: "saber cuándo **no** usar un LLM" | — |
| 0:49 | 27 | Agentes de código: CLAUDE.md, hooks, **revisor: NOT READY**, la cita de la bitácora | Opcional: abrir `docs/revision-agentica.md` |
| 0:52 | 28 | Producción: costo por conversación, p50/p95, drift. "Muestra pequeña, y lo decimos" | Opcional: `/panel/salud` |
| 0:54 | 29 | Una lección por pilar | — |
| 0:55 | 30 | **QR.** Dejarlo en pantalla durante las preguntas | — |

## Parte 3 · Preguntas (slide 30 en pantalla, ~5 min)

Preguntas que probablemente harán y dónde está la respuesta:

| Pregunta | Respuesta corta | Dónde |
|---|---|---|
| ¿Cuánto costó construirlo? | ~US$ 4,6 de API usada por la app (evals, pruebas, scripts), **más** el agente de código, que se mide aparte (`/cost` en Claude Code) | [README](../README.md) |
| ¿Tengo que pagar para probarla? | No: sin clave funciona en modo demo. Con tu clave de Anthropic, pagas solo tu uso (unos centavos) | [README](../README.md#usa-tus-propias-claves) |
| ¿Cuánto cuesta cada conversación? | ~US$ 0,016 por conversación en la telemetría real (muestra pequeña) | `/panel/salud`, [`datos-salud.json`](../presentacion/datos-salud.json) |
| ¿Y si el modelo se equivoca? | Por eso las evals, la aprobación humana y que el precio lo ponga el código | [paso 04](pasos/paso-04-evals.md), [paso 06](pasos/paso-06-agente.md) |
| ¿Puedo usarlo para mi proyecto? | Sí, licencia MIT; empieza por [`docs/setup.md`](setup.md) | — |
| ¿El agente lo hizo solo? | Con 3 puntos de control humanos, una spec aprobada y un recorte de alcance decidido por la persona | [bitácoras](bitacora/) |

---

## Plan B (si algo falla)

| Falla | Qué hacer | Tiempo |
|---|---|---|
| Internet lento o la API no responde | Cambiar a la pestaña del **modo mock** local: `AI_MODE=mock ANTHROPIC_API_KEY= pnpm dev` → `http://localhost:3000/copilot`. **Es la misma demo**, con las herramientas reales y la respuesta grabada | < 1 min |
| No hay internet ni computador con el repo | Mostrar las capturas reales de producción: [`docs/img/demo/`](img/demo/) (búsqueda, simulación, aprobación, pre-propuesta, panel, salud) | inmediato |
| Rate limit en plena demo (mucha gente usando el QR) | Decir: *"Esto es el guardrail funcionando"* y pasar al modo mock | < 1 min |
| El panel pide login y no llega el correo | Usar las capturas `05-panel.png` y `06-salud.png` | inmediato |

Detalles operativos en el [runbook](runbook.md).
