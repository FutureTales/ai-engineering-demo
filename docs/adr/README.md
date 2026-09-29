# Registros de decisiones de arquitectura (ADR)

Un ADR es un documento corto que registra **una** decisión: el contexto, lo que decidimos, las alternativas y sus consecuencias. Sirve para que alguien que llega después (o tú en seis meses) entienda **por qué** el sistema es como es.

| # | Decisión | Paso |
|---|---|---|
| [0001](0001-nextjs-vercel.md) | Next.js + Vercel | 02 |
| [0002](0002-supabase-pgvector.md) | Supabase y pgvector frente a una base vectorial dedicada | 02 |
| [0003](0003-recuperacion-hibrida.md) | Recuperación híbrida (vector + texto completo) | 02 |
| [0004](0004-ai-sdk.md) | Vercel AI SDK frente al SDK directo de Anthropic | 02 |
| [0005](0005-clasificador.md) | Clasificador: LLM en el agente, ML clásico para triage masivo | 07 |
| [0006](0006-trae-tu-propia-clave.md) | "Trae tu propia clave": la app pública no paga el uso de nadie | después del 10 |

Formato: Contexto · Decisión · Alternativas consideradas · Consecuencias · Estado.
