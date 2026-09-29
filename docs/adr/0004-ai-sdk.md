# ADR 0004 — Vercel AI SDK frente al SDK directo de Anthropic

**Estado:** aceptada (paso 02)

## Contexto

La app necesita: streaming de texto al navegador, llamadas a herramientas (tool calling) con esquemas validados, un loop de agente con máximo de pasos y una UI que muestre cada llamada a herramienta. El modelo es Claude.

## Decisión

Usar el **Vercel AI SDK** (`ai` v7, `@ai-sdk/anthropic`, `@ai-sdk/react`) con Claude como proveedor. Los IDs de modelo se centralizan en `lib/ai/models.ts`.

## Alternativas consideradas

| Alternativa | Ventaja | Por qué no (aquí) |
|---|---|---|
| SDK directo de Anthropic (`@anthropic-ai/sdk`) | Acceso inmediato a todas las funciones del modelo; menos capas | Habría que escribir a mano el protocolo de streaming hacia React, el estado del chat y el renderizado de herramientas |
| LangChain / LangGraph | Muchas integraciones | Más abstracción de la necesaria para un agente con 3 herramientas; más difícil de explicar en una charla |

## Consecuencias

- ✅ `useChat` en el cliente y `streamText` en el servidor resuelven streaming, estado y herramientas con poco código.
- ✅ Esquemas de herramientas con **zod**: la misma definición valida las entradas y documenta la herramienta para el modelo.
- ✅ Cambiar de proveedor de modelo sería posible sin reescribir la app.
- ⚠️ Capa adicional: funciones nuevas de Claude pueden tardar en estar disponibles en el SDK. Opciones específicas (como el prompt caching) se pasan con `providerOptions`.
- ⚠️ La versión instalada (v7) es más nueva que el conocimiento del agente de código. Regla: **leer la documentación de la versión instalada antes de escribir código**, no asumir la API.
