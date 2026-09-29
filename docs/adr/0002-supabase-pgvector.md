# ADR 0002 — Supabase (Postgres + pgvector) frente a una base vectorial dedicada

**Estado:** aceptada (paso 02)

## Contexto

Necesitamos guardar datos relacionales (solicitudes, conversaciones, telemetría, evals), autenticar al personal del centro y hacer búsqueda semántica sobre un catálogo **pequeño** (13 documentos, decenas de fragmentos).

## Decisión

**Supabase**: Postgres administrado con la extensión **pgvector** para los embeddings, **Auth** para el login del panel y **Row Level Security (RLS)** para el control de acceso. Una sola base de datos para todo.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Base vectorial dedicada (Pinecone, Weaviate, Qdrant) + otra base para lo relacional | Dos sistemas, dos consistencias, dos facturas. Para decenas de fragmentos no hay beneficio de escala |
| Vectores en memoria / archivo JSON | Sirve para un prototipo, pero no permite combinar con búsqueda de texto completo ni filtrar con SQL |
| Firebase | Sin SQL ni vectores nativos; el panel de KPIs sería más difícil |

## Consecuencias

- ✅ Un solo lugar para datos, vectores, auth y permisos. Las consultas pueden mezclar filtros SQL (por línea de trabajo) con similitud vectorial.
- ✅ La búsqueda de texto completo en español (`tsvector` con configuración `spanish`) viene incluida: permite recuperación híbrida (ADR 0003).
- ✅ RLS: la seguridad vive en la base de datos, no solo en el código de la app.
- ⚠️ pgvector con índice HNSW escala bien hasta millones de vectores; si algún día hubiera cientos de millones, se reevaluaría.
- ⚠️ Plan gratuito: el proyecto se pausa tras un periodo de inactividad. Documentado en el runbook.
