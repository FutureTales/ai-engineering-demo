# ADR 0001 — Next.js (App Router) + Vercel

**Estado:** aceptada (paso 02)

## Contexto

Necesitamos una app web con chat en streaming, un panel con login y endpoints de API, desplegada en una URL pública **en días**, por un equipo de una persona más un agente de código. Los asistentes la abrirán desde el celular al escanear un QR.

## Decisión

Un solo proyecto **Next.js (App Router) + TypeScript**, desplegado en **Vercel**, región de funciones `iad1` (Washington D. C.), la misma zona que la base de datos (`us-east-1`).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Frontend (React) + backend separado (FastAPI) | Dos despliegues, dos lenguajes y CORS. Más piezas que mantener para un MVP |
| Streamlit / Gradio | Muy rápido para prototipos, pero limitado para un panel con login, rutas y UI a medida |
| Servidor propio (VM) | Hay que operar el servidor, TLS y despliegues. No aporta nada al objetivo |

## Consecuencias

- ✅ Frontend y API en el mismo repo y lenguaje; cada push a `main` despliega y cada PR tiene una URL de preview.
- ✅ El streaming de respuestas del LLM está soportado de forma nativa.
- ⚠️ Las funciones serverless tienen límite de duración: el loop del agente debe tener un máximo de pasos (paso 06).
- ⚠️ Dependencia de un proveedor (Vercel). Mitigación: Next.js también corre en cualquier servidor Node.
