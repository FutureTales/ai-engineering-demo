# One-pager: Innova Copilot

> Demo educativa. El centro, sus servicios y las empresas son ficticios.

## Propuesta de valor

**Para** dueños de MIPYMES de Bolívar **que** tienen un problema de operación, calidad o innovación y no saben qué ayuda pedir, **Innova Copilot** es un copiloto conversacional **que** en una sola conversación entiende el problema, lo encuadra en una línea de trabajo del Centro de Innovación Caribe, recomienda servicios citando el catálogo, simula escenarios "what if" con números reales y deja lista una pre-propuesta. **A diferencia de** un formulario o un correo que se responde en semanas, entrega un primer análisis cuantitativo **en minutos**, y el coordinador del centro decide con información completa.

## Alcance del MVP (lo que sí hacemos)

1. Conversación de diagnóstico con máximo 3 preguntas aclaratorias.
2. Clasificación en una de 3 líneas: `quality_assurance`, `business_innovation`, `process_design`.
3. Recomendación de 1–2 servicios del catálogo, **con cita** a la ficha.
4. Simulación de filas y capacidad (`simulate_queue`) con tabla y gráfico.
5. Pre-propuesta guardada con autorización del usuario (`create_request`).
6. Panel para el equipo del centro, con login, solicitudes y salud del asistente.
7. Evals automáticas, telemetría de costo y latencia, modo mock sin red.

## Fuera de alcance (lo que no hacemos en el MVP)

- Canales distintos a la web (WhatsApp, voz): ver `docs/roadmap-v2.md`.
- Integración con software comercial de simulación.
- Precios o contratos definitivos: solo **rangos** del catálogo.
- Asesoría legal definitiva (por ejemplo, registro de marca).
- Multi-idioma: solo español.
- Cuentas para las MIPYMES: la conversación es anónima salvo el contacto comercial.

## Riesgos y cómo los mitigamos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El modelo inventa servicios o precios | Alto: daña la confianza | RAG con citas, evals que detectan precios fuera de catálogo |
| El modelo calcula mal la simulación | Alto | El LLM no calcula: herramienta determinista con tests |
| Prompt injection o uso fuera de tema | Medio | Guardrails; el contenido recuperado es dato, no instrucción; evals adversariales |
| Abuso de la URL pública (QR en la charla) | Medio: costo de API | Rate limit por IP y sesión, tope diario, límite de gasto en la consola |
| Falla de red o de la API durante la demo | Alto en la charla | `AI_MODE=mock` con respuestas grabadas; capturas de respaldo |
| Datos personales | Medio (Ley 1581) | Solo contacto comercial; aviso en la UI; RLS en la base de datos |
| Costo mayor al esperado | Bajo–medio | Telemetría por turno; modelo pequeño para clasificar y evaluar |

## Cómo sabremos que funciona

Ver [metricas.md](metricas.md). Resumen: la métrica norte es el **% de conversaciones que terminan en una pre-propuesta bien encuadrada**, medida con evals y revisión humana.
