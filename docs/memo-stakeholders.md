# Memo: copiloto de IA para la atención a MIPYMES

**Para:** dirección de un centro de innovación universitario
**De:** equipo del proyecto Innova Copilot (demo educativa, Future Tales)
**Fecha:** 29 de septiembre de 2026
**Propuesta:** un piloto de 8 semanas con 15–20 MIPYMES reales

---

## En una frase

Construimos un copiloto que, en una conversación de menos de un minuto, encuadra el problema de una MIPYME, recomienda servicios **reales** del catálogo con su precio, simula escenarios "what if" con números calculados (no inventados) y deja una pre-propuesta lista para que un coordinador la revise. Funciona en una demo con datos ficticios; **falta probarlo con empresas reales**.

## Qué medimos (datos ficticios, 30 casos de prueba)

| Resultado | Número | Fuente |
|---|---|---|
| Casos resueltos sin errores, versión final | **29 de 30** (y 28 de 30 en una segunda corrida; los fallos se deben a un defecto conocido de la prueba, no del copiloto) | [evals](../evals/results/) |
| Mejora frente a un chatbot sin datos | de **3 de 30** a 29 de 30 | [comparación](../evals/results/comparacion.json) |
| Respuestas con precios inventados | de **63 %** (sin datos) a **0 %** | ídem |
| Caso del hotel en producción: diagnóstico + simulación + pre-propuesta guardada | **26 y 32 segundos** de punta a punta (dos corridas) | [corrida 1](img/demo/resultado-2026-09-29T1811.json), [corrida 2](img/demo/resultado-2026-09-29T1832.json) |
| Costo por conversación (telemetría real, muestra pequeña de 10 conversaciones) | **~US$ 0,016** | [salud](../presentacion/datos-salud.json) |
| Intentos de manipulación resistidos (inyecciones de instrucciones) | 2 de 2 | evals adversariales |

**Qué no medimos:** el efecto en el negocio (tiempo hasta la primera propuesta, tasa de conversión, satisfacción). Es imposible con datos ficticios, y justifica el piloto.

## Costos

| Concepto | Estimado |
|---|---|
| Uso de API de la app durante el desarrollo (evals, pruebas, scripts; calculado con los tokens registrados). **No incluye** el agente de código que lo construyó | ~US$ 4,6 |
| Operación por conversación | ~US$ 0,02 |
| Piloto (20 empresas × ~5 conversaciones + evals semanales) | < US$ 20 en API |
| Infraestructura (Vercel y Supabase, planes gratuitos) | US$ 0 en el piloto; para producción real, planes pagos de Vercel y Supabase (consultar precios vigentes: no los verificamos) |
| Tiempo del equipo del centro | 2–4 h/semana de un coordinador para revisar pre-propuestas y etiquetar casos |

> Los costos de API son estimaciones con los precios públicos del 2026-09-29.

## Riesgos y cómo están controlados

| Riesgo | Control |
|---|---|
| Que prometa precios o servicios que no existen | El precio lo calcula el sistema desde el catálogo; las evals lo verifican en cada cambio (0 % inventados) |
| Que se equivoque en los cálculos | Los números salen de una herramienta de simulación con pruebas, no del modelo |
| Que guarde algo sin permiso | Guardar exige aprobación explícita del usuario |
| Abuso y costos descontrolados | Límites por persona, tope diario, límite de gasto; revisión de seguridad independiente (3 fallas graves encontradas y corregidas) |
| Datos personales (Ley 1581) | Solo contacto comercial; aviso en la interfaz. **Requiere revisión legal antes del piloto** |
| Que falle en plena atención | Modo de respaldo sin conexión y manual de operación |

## Propuesta de piloto (8 semanas)

1. **Semanas 1–2:** cargar el catálogo y las tarifas **reales**; revisión legal; 20 casos reales anonimizados como nuevas pruebas.
2. **Semanas 3–6:** 15–20 MIPYMES lo usan; los coordinadores revisan cada pre-propuesta en el panel y corrigen la clasificación.
3. **Semanas 7–8:** medir y decidir.

**Criterios de éxito (se definen antes de empezar):**
- ≥ 80 % de pre-propuestas que el coordinador acepta sin cambios de fondo.
- Tiempo hasta el primer contacto con propuesta: la mitad del actual (medirlo antes del piloto).
- 0 precios fuera de catálogo en producción.
- Costo por conversación < US$ 0,10.

**Decisión que pedimos:** aprobar el piloto y asignar un coordinador responsable.
