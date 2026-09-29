# Retrospectiva

Qué funcionó, qué no y qué aprendimos construyendo Innova Copilot con un agente de código (Claude Code) en un día de trabajo, para una charla dos días después.

## Qué funcionó

| Qué | Evidencia |
|---|---|
| **Spec primero, con aprobación humana** | Los requisitos no funcionales del paso 00 se convirtieron casi uno a uno en chequeos de evals en el paso 04 |
| **Desplegar desde el paso 02** | Cada paso se probó en la URL real; el problema del dominio ocupado apareció el primer día, no en la charla |
| **Evals antes de optimizar** | Cada decisión posterior (RAG, híbrido, agente, clasificador) se tomó con números: 3/30 → 24/30 → 29/30 |
| **"El LLM no calcula"** | La simulación del hotel sale de una función con 17 tests; el agente usó sus cifras exactas en 4 de 4 casos |
| **Verificar contra la fuente, no contra la memoria** | Al menos 10 cambios de API detectados a tiempo (ver abajo) |
| **Revisión con contexto limpio** | El subagente revisor encontró 3 fallas graves que las pruebas del autor no veían |
| **Plan B probado automáticamente** | El modo mock corre en CI, sin claves, en escritorio y celular |

## Qué no funcionó (y cómo lo detectamos)

| Qué falló | Cómo se detectó | Qué cambió |
|---|---|---|
| El primer juez premió un precio inventado | Leyendo a mano las 2 primeras respuestas calificadas | Rúbrica con procedimiento de verificación antes de puntuar |
| La primera línea base medía mal (53 % en línea correcta) | Revisando los fallos uno por uno antes de publicar el número | Seguimiento simulado del usuario en el dataset |
| Un filtro de texto confundía "citar" con "obedecer" en la inyección | Ídem | Pregunta explícita al juez |
| El historial perdía las llamadas a herramientas | El modelo "confesó" un error que no había cometido | `responseMessages` en vez de `response.messages` |
| En celular la página medía 972 px de ancho | El test e2e en viewport de celular | `flex-wrap` + test de regresión de desborde |
| Tres formas baratas de disparar el costo | La revisión agéntica | Validación de todo el historial, tope diario del lado del servidor, topes de la simulación |
| Cambié herramientas en el paso 08 sin volver a evaluar | El control de regresión del paso 09, **al probarlo sobre mi propio historial** | Eval en vivo de la versión del paso 09 |
| Cifras escritas "de memoria" en los docs (27 tests, 300 líneas, 4.000 tokens, 25–84 ejemplos, "un modelo de 1998") | Verificando cada número antes de publicar | Regla aplicada: todo número se mide o se quita |
| `supabase config push` cambió más de lo pedido | Leyendo el diff | Alinear `config.toml` con el remoto y volver a subir |

## Qué aprendimos trabajando con el agente de código

1. **El agente es rápido escribiendo y lento dudando.** Casi todos los errores vinieron de dar algo por supuesto: una API recordada, un número estimado, un cliente honesto. La productividad real vino de convertir cada duda en una verificación barata: una llamada a `/v1/models`, un `count_tokens`, una prueba de 2 casos.
2. **Las APIs cambian más rápido que el conocimiento del modelo.** En un solo día aparecieron al menos 10:
   - AI SDK v7: `instructions`, `responseMessages` y `toolApproval`.
   - `temperature` desapareció en Sonnet 5.5 y en el SDK de Python 1.x.
   - Next.js 16: `proxy.ts` y `AGENTS.md`.
   - Supabase SSR: `getClaims()` y `setAll` con headers.
   - Gemini: el endpoint `interactions`.
   - Sonnet 5.5 salió **el día anterior**, y su precio no estaba en la referencia del agente.

   La documentación que viene **dentro** del paquete instalado (`node_modules/ai/docs`, `node_modules/next/dist/docs`) fue la fuente más confiable.
3. **Una regla escrita es una petición; un control automático es una garantía.** Eso vale para el agente (hooks, permisos) y para el producto (aprobación firmada, precio calculado por el código, control de regresión en CI).
4. **El humano decide lo que el agente no puede decidir:** qué construir (spec), qué recortar (pasos 07–09 más ligeros), con qué identidad publicar (autor de los commits) y qué riesgos aceptar.
5. **La bitácora vale más que el código para enseñar.** Los errores documentados (la eval que medía mal, el juez engañado, el bug del celular) son lo que más sirve en una charla, y solo existen porque se escribieron en el momento.

## Qué haríamos distinto

- Escribir el **dataset de evals antes** del primer prompt (paso 03), y no después. Habría evitado el defecto del seguimiento.
- Pedir la **revisión agéntica al final de cada paso**, no solo en el 08.
- Configurar el **método de pago de Voyage** el primer día: el límite de 3 solicitudes por minuto hizo que las evals híbridas tardaran unos 25 minutos cada una.
- **Datos reales**, aunque sean pocos: todo lo medido aquí es sobre datos sintéticos o ficticios.
