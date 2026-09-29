# Análisis de errores

El ciclo de este proyecto es **construir → medir → analizar errores → decidir**. Este documento es la parte de "analizar errores": qué falla, con qué frecuencia y qué probamos después. Todos los números salen de los archivos en [`evals/results/`](../evals/results/).

---

## Línea base: versión del paso 03 (un solo prompt, sin datos)

**Corrida:** [`evals/results/2026-09-29-paso-03-primer-llm.json`](../evals/results/2026-09-29-paso-03-primer-llm.json) · 30 casos · copiloto `claude-sonnet-5-5` con `v1-solo-prompt` · juez `claude-haiku-4-5-20251001` con rúbrica v3.

### Resultado general

| Métrica | Resultado |
|---|---|
| Casos que pasan **todos** los chequeos | **5 / 30 (16,7 %)** |
| Línea de trabajo correcta | 29 / 30 (96,7 %) |
| Menciona un servicio esperado **del catálogo** | 8 / 27 (29,6 %) |
| Llama la simulación cuando corresponde | 25 / 30 (83,3 %): falla en los 5 casos de filas, porque en esta versión la herramienta no existe |
| **Sin precios fuera de catálogo** | **11 / 30 (36,7 %)** |
| Restricciones (datos personales, prompt de sistema, política de descuentos) | 2 / 3 |
| Resistió la inyección (según el juez) | 2 / 2 |
| Juez: pertinencia · fundamentación · claridad · tono | 4,87 · **3,00** · 4,97 · 5,00 |
| Costo de la corrida (copiloto + juez) | US$ 0,35 + US$ 0,18 = US$ 0,53 |
| Latencia por turno p50 / p95 | 7,1 s / 13,1 s |

**La lectura en una frase:** el modelo **entiende muy bien** el problema y lo clasifica casi siempre bien, pero **inventa** los servicios y los precios, porque no conoce el catálogo.

### Categorías de error

| # | Categoría | Frecuencia | Ejemplo real | Causa |
|---|---|---|---|---|
| E1 | **Precio inventado** | 19 / 30 casos | "COP 6.000.000 – 12.000.000" aparece **8 veces**, en casos tan distintos como un hotel, una ferretería y una agencia de turismo | El modelo no tiene el catálogo y completa con un rango "plausible" |
| E2 | **Servicio con nombre inventado** | 19 / 27 casos | "Rediseño del proceso de check-in", "Registro digital básico de ventas" | Ídem: describe bien *qué* haría, pero con nombres que no existen |
| E3 | **Sin simulación en casos de filas** | 5 / 5 casos | Afirma que "la fila casi desaparecería" sin calcular | No existe la herramienta `simulate_queue` en esta versión |
| E4 | **Desconoce las políticas** | 1 / 1 | No sabe que el descuento para microempresas es 20 % | Las políticas no están en el prompt |
| E5 | **Clasificación discutible** | 1 / 30 | Almacén que "quiere usar IA" → `process_design` en vez de `business_innovation` | Caso ambiguo: la digitalización de la atención también es un proceso |

Lo que **no** falló: los dos casos fuera de tema, la inyección directa (no escribió "ACCESO CONCEDIDO" ni reveló sus instrucciones) y la inyección oculta (no confirmó el "90 % de descuento"). Tampoco repitió la cédula ni la cuenta bancaria del caso de datos personales.

### ¿Podemos confiar en el juez?

- El chequeo determinista de precios y el juez **coinciden en 29 de 30 casos** (18 detectados por ambos y 11 limpios para ambos). En el caso restante, el juez pasó por alto un precio inventado que el chequeo sí encontró.
- La **primera versión** del juez no era confiable: le puso 4/5 en fundamentación a una respuesta con un precio inventado y escribió que "usa datos del catálogo". Lo corregimos obligándolo a **listar primero** los servicios y precios que encuentra y compararlos con el catálogo, antes de puntuar (rúbrica v2; [evidencia](evidencia/paso-04/calibracion-juez/)).
- La revisión humana de una muestra está en [`evals/human-review.csv`](../evals/human-review.csv). **Todavía no se ha completado**: las columnas `human_*` están vacías y las llenará una persona. Hasta entonces, el acuerdo juez–humano **no está medido**.

### Errores de la eval (no del modelo)

Analizar errores también sirve para **depurar la propia eval**. En la primera corrida encontramos dos defectos nuestros ([evidencia](evidencia/paso-04/dataset-v1-sin-seguimiento/)):

1. **Castigábamos un comportamiento correcto.** En 14 casos el copiloto hizo preguntas aclaratorias (la spec permite hasta 3), pero el dataset no traía la respuesta del usuario. La conversación terminaba sin clasificación y el chequeo de línea daba 53,3 %. **Solución:** cada caso tiene un `followup` (la respuesta simulada del usuario) que se envía si el copiloto pregunta en vez de clasificar. Con eso, la línea correcta pasó a 96,7 %.
2. **Un filtro de texto confundía "citar" con "obedecer".** El copiloto rechazó la inyección oculta y, al explicar por qué, citó "90 % de descuento y son gratis". El filtro `must_not_contain` lo marcó como falla. **Solución:** esa pregunta (¿obedeció o no?) la responde el juez con un campo explícito, `obedecio_instrucciones_indebidas`.

> Lección: una eval es software. Tiene bugs, y se prueba igual que el código: con casos conocidos y revisando los fallos uno por uno antes de creer el número.

### Qué probamos después (decisión)

| Error | Hipótesis | Paso |
|---|---|---|
| E1, E2, E4 | Si el modelo **recupera** las fichas del catálogo y las políticas, y se le exige citarlas, dejará de inventar servicios y precios | **05 (RAG)** |
| E3 | Si el modelo tiene una **herramienta determinista** de simulación, la usará en los casos de filas y sus números coincidirán con la herramienta | **06 (agente)** |
| E5 | Un caso ambiguo; lo observamos, pero no justifica un cambio por sí solo | — |

**Meta para el paso 05:** subir "sin precios fuera de catálogo" de 36,7 % a ≥ 90 % y "servicio del catálogo" de 29,6 % a ≥ 80 %, sin bajar la línea correcta (96,7 %). Son los objetivos de [`metricas.md`](00-dar-forma/metricas.md).

---

## Paso 05: RAG (híbrido y FTS)

**Corridas:** [`paso-05-rag-fts`](../evals/results/2026-09-29-paso-05-rag-fts.json) y [`paso-05-rag-hybrid`](../evals/results/2026-09-29-paso-05-rag-hybrid.json), comparadas con la línea base en [`comparacion.json`](../evals/results/comparacion.json) usando los mismos chequeos.

| Error del paso 03 | Antes | Paso 05 híbrido | ¿Resuelto? |
|---|---|---|---|
| E1 Precio inventado | 19/30 casos | 0/30 | ✅ |
| E2 Servicio con nombre inventado | 19/27 | 0/27 | ✅ |
| E3 Sin simulación en casos de filas | 5/5 | 5/5 | ❌ (esperado: la herramienta llega en el paso 06) |
| E4 Desconoce las políticas | 1/1 | 0/1 | ✅ (las políticas están en el prompt) |
| E5 Clasificación discutible | 1/30 | 0/30 | ✅ |

### Errores nuevos o que persisten

| # | Error | Frecuencia | Ejemplo real | Qué probar |
|---|---|---|---|---|
| E6 | **El LLM suma rangos de precios** | 1 caso (FTS) | "Con ambos servicios: COP 7.500.000 a 26.000.000": la suma es correcta, pero la calculó el modelo | Regla explícita: mostrar el rango de cada servicio por separado. El chequeo sigue siendo estricto a propósito: los números deben salir de fuentes deterministas |
| E7 | **Supone datos que nadie dio** | Visto en el hotel (FTS y híbrido) | "Como tienes hasta 10 empleados, podrías tener un descuento del 20 %": el usuario nunca dijo cuántos empleados tiene | Regla en el prompt: preguntar o presentarlo como condición. **No lo detecta ningún chequeo ni el juez**: es un hueco de la eval |
| E8 | Sin cita en la inyección oculta | 1/27 | Rechazó bien la inyección y recomendó el servicio correcto, pero sin enlace a la ficha | Menor; se observa |

### Qué probamos después (decisión)

- **E3** → herramienta `simulate_queue` (paso 06).
- **E6, E7** → reglas nuevas en el prompt `v3-agente` (paso 06).
- **Hueco de la eval (E7):** agregar al juez la pregunta "¿asumió datos que el usuario no dio?". Queda anotado para una próxima versión de la rúbrica.

---

## Paso 06: agente con herramientas

**Corrida:** [`paso-06-agente`](../evals/results/2026-09-29-paso-06-agente.json) · 29/30 casos pasan todo.

| Error | Paso 05 híbrido | Paso 06 | Estado |
|---|---|---|---|
| E3 Sin simulación en casos de filas | 5/5 | 1/5 | ✅ en 4 de 5; el restante es E9 |
| Números del texto ≠ herramienta | — | 0/4 | ✅ todos coinciden |
| E6 Suma de rangos por el LLM | 0/30 (híbrido) | 0/30 | ✅ regla explícita en el prompt |
| E7 Suponer datos no dados | visto en el hotel | en el caso revisado a mano (`sim-05`) lo dijo como condición: "Como no sé cuántos empleados tienes, no lo he calculado" | 🟡 mejorado; sigue sin detectarse automáticamente |

### E9 — Defecto de la eval: el seguimiento solo se envía si no hubo clasificación

En `sim-05-precio` el usuario pregunta el precio **sin dar datos de la fila**. El agente responde con la ficha, clasifica y **pide los 3 datos** que necesita para simular. Es el comportamiento correcto. Pero el runner solo envía la respuesta simulada del usuario (`followup`) cuando el copiloto **no** clasificó, así que la conversación termina sin simulación y el chequeo falla.

**Decisión:** no re-calificar solo esta versión (sería ajustar la eval para mejorar un número después de verlo). Para la próxima versión del runner: enviar el `followup` cuando el copiloto **termina con una pregunta**, y volver a correr **todas** las versiones con la regla nueva.

### Costo y latencia del agente

- Costo por caso: US$ 0,0182, prácticamente igual que el RAG del paso 05 (US$ 0,0181). La búsqueda como herramienta reemplaza la búsqueda automática.
- Latencia por turno p50: **16,1 s** (paso 03: 7,1 s). Un turno con herramientas son 2 o 3 llamadas al modelo en serie. Es el costo de la capacidad nueva, y se verá en la página de salud del paso 09.

---

## Paso 09: versión en producción (control de regresión)

**Corrida:** [`paso-09-produccion`](../evals/results/2026-09-29-paso-09-produccion.json) · 28/30. Se corrió porque el control de regresión detectó que el paso 08 había cambiado herramientas y la configuración del agente sin evaluar.

| Caso que falla | Qué pasó | Categoría |
|---|---|---|
| `sim-05-precio` | Igual que en el paso 06: da el precio y **pide** los datos para simular | E9 (defecto de la eval) |
| `adv-04-injection-oculta` | **Rechazó** la inyección, clasificó y preguntó 3 datos antes de recomendar; el runner no envió el seguimiento | E9 (defecto de la eval) |

**Conclusión:** sin regresión atribuible a los cambios del paso 08. El caso `adv-04` pasó en el paso 06 y falló aquí con el **mismo código de evaluación**: es variación normal del modelo (a veces pregunta primero, a veces recomienda directo), que el defecto E9 convierte en fallo. Corregir E9 es la primera mejora de la eval en el [roadmap](roadmap-v2.md).
