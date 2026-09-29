# Roadmap v2: de demo a piloto

Lo que haríamos después de la charla, ordenado por **valor para el centro** y respaldado por lo que aprendimos (evals, revisión agéntica, telemetría).

## Antes de un piloto con MIPYMES reales (imprescindible)

| # | Qué | Por qué (evidencia) |
|---|---|---|
| 1 | **Datos reales:** catálogo, precios y políticas validados por el centro | Todo el catálogo es ficticio; los precios de la demo no son una oferta |
| 2 | **Historial de la conversación guardado en el servidor** | Hallazgo 5 de la [revisión agéntica](revision-agentica.md): hoy el cliente envía el historial y podría inventar resultados de herramientas |
| 3 | **Revisión humana del dataset y del juez** (20+ casos) | El acuerdo juez–humano **no está medido** (paso 04) |
| 4 | **Casos de evaluación con paráfrasis y con solicitudes reales** anonimizadas | El dataset actual no mostraba la ventaja del híbrido (paso 05); las solicitudes reales son más ruidosas |
| 5 | **Método de pago en Voyage** y límites de gasto en todos los proveedores | Hoy Voyage limita a 3 solicitudes por minuto y cae a FTS (paso 05) |
| 6 | **Migrar el juez fuera de Haiku 4.5** antes de su retiro (no antes del 15 oct 2026) | [Runbook §9](runbook.md) |
| 7 | **Aviso de privacidad y consentimiento** (Ley 1581) revisados por un abogado | La demo solo lo menciona en el footer y en la política ficticia |

## Mejoras del producto

| Qué | Idea |
|---|---|
| **Canal de WhatsApp** | La mayoría de MIPYMES escribe por WhatsApp (lo mencionan las entrevistas simuladas). Reutilizar el mismo agente con un adaptador de mensajería |
| **Voz** | Notas de voz transcritas: el dueño explica el problema hablando |
| **Integración con software de simulación** | Exportar los escenarios de `simulate_queue` al software de eventos discretos del centro para el estudio formal |
| **Llegadas no Poisson** | Simular llegadas en grupo (un bus de turistas) y horarios con picos; hoy el modelo supone llegadas aleatorias |
| **Panel: flujo de estados** | Pasar solicitudes de "Nueva" a "Propuesta enviada" desde el panel (la base ya lo permite: solo la columna `status`) |
| **Etiquetas del coordinador como datos de entrenamiento** | Cada corrección del coordinador alimenta el clasificador clásico del paso 07, que hoy tiene varianza alta por falta de datos |
| **Multi-idioma** | Inglés para empresas exportadoras |

## Mejoras de ingeniería

| Qué | Por qué |
|---|---|
| Revisión agéntica automática **en cada PR** (subagente en CI) | Encontró 3 fallas graves en 7 minutos; hoy se corre a mano |
| Runner de evals: enviar el seguimiento cuando el copiloto **pregunta** | Defecto E9 del [análisis de errores](analisis-de-errores.md) |
| Rúbrica del juez: detectar **supuestos no dados** | Hueco E7: ningún chequeo lo detecta hoy |
| Rate limit con ventana deslizante | Las ventanas fijas permiten el doble en el borde (paso 06) |
| Pruebas de carga del endpoint | No medidas: no sabemos cuántas conversaciones simultáneas aguanta el plan gratuito |
| Alertas automáticas (costo diario, tasa de error, drift) | Hoy hay que mirar el panel |
