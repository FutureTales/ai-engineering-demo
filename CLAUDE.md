# CLAUDE.md — Innova Copilot (`ai-engineering-demo`)

Este archivo lo lee Claude Code al empezar cada sesión en este repo. Es la "memoria de proyecto" del agente: qué es esto, cómo se trabaja y qué reglas no se rompen.

## Qué es

Demo educativa: un copiloto de IA para un centro de innovación universitario **ficticio** ("Centro de Innovación Caribe") que atiende MIPYMES **ficticias**. Acompaña la charla "AI Engineering Skills Map" (serie de Andrew Ng en *The Batch*). Cada paso del proyecto es un tag de git (`paso-XX-nombre`) documentado en `docs/pasos/`.

La spec aprobada está en `docs/00-dar-forma/spec-mvp.md`. Si una tarea contradice la spec, pregunta antes de seguir.

## Reglas no negociables

1. **Nunca inventes métricas.** Todo número en docs, README o slides (accuracy, costo, latencia, puntajes de evals) sale de una ejecución real guardada en el repo (`evals/results/`, `ml/`, tabla `interactions`). Si algo no se midió, escribe "no medido".
2. **Nunca escribas secretos en archivos versionados.** Las claves van en `.env.local` (ignorado por git), en Vercel (`vercel env add`) o en los secretos de GitHub. Un hook bloquea escribir patrones de claves.
3. **Datos ficticios, siempre marcados.** No uses el nombre ni la marca de instituciones reales en la app. El producto se llama **Innova Copilot**.
4. **El LLM no calcula.** Toda cifra de simulación viene de `simulate_queue` (determinista, con tests). Todo servicio o precio viene del catálogo (`data/catalog/`).

## Idioma

- **Español:** documentación, UI, slides, textos al usuario, bitácora.
- **Inglés:** código, variables, funciones, tablas, columnas, comentarios en el código.
- **Commits:** en inglés, formato *conventional commits* (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`).
- **Tags:** en español, anotados: `git tag -a paso-03-primer-llm -m "..."`.

## Arquitectura (se completa por pasos)

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend + API | Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, Recharts | `app/`, `components/` |
| LLM | Claude vía Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | `lib/ai/` (IDs de modelo **solo** en `lib/ai/models.ts`) |
| Herramientas del agente | zod + funciones deterministas | `lib/tools/` |
| RAG | Voyage (embeddings) + Postgres FTS en español, fusión RRF | `lib/rag/`, `scripts/ingest.ts` |
| Guardrails y rate limit | | `lib/guardrails/` |
| Telemetría | tabla `interactions` | `lib/telemetry/` |
| Base de datos | Supabase (Postgres + pgvector + Auth + RLS) | `supabase/migrations/` |
| Evals | dataset JSONL + deterministas + LLM-as-judge | `evals/` |
| ML clásico | Python, scikit-learn, notebook | `ml/` |

Diagramas y trade-offs: `docs/arquitectura.md`. Decisiones: `docs/adr/`.

## Comandos

| Comando | Qué hace | Disponible desde |
|---|---|---|
| `pnpm dev` | App local (usa `AI_MODE` de `.env.local`) | paso 02 |
| `AI_MODE=mock pnpm dev` | App sin claves ni red | paso 06 |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Calidad de código | paso 02 |
| `pnpm test:e2e` | Playwright en modo mock | paso 08 |
| `pnpm eval` | Evals en vivo (cuesta tokens) | paso 04 |
| `pnpm eval --mock` | Evals con respuestas grabadas (CI, sin costo) | paso 04 |
| `gitleaks git --redact -v` | Busca secretos en el historial | paso 01 |

## Cómo correr evals

1. `pnpm eval --mock` primero (gratis) para validar que el runner funciona.
2. `pnpm eval` en vivo; el resultado queda en `evals/results/<fecha>-<version>.json` y en `eval_runs`/`eval_results`.
3. Compara con la corrida anterior y reporta **solo** los números de esos archivos. Usa `/eval`.

## Flujo de trabajo por paso

1. `/nuevo-paso XX nombre` crea `docs/pasos/paso-XX-nombre.md` y `docs/bitacora/paso-XX.md` desde la plantilla.
2. Construir → verificar (lint, typecheck, tests, evals si aplica) → documentar.
3. Bitácora: prompt exacto del humano, comandos ejecutados y sus resultados, decisiones humanas y **lo que salió mal**.
4. `/revisar` antes de cerrar pasos con código.
5. Commit(s), tag anotado del paso y push con tags. Cada tag debe funcionar por sí solo.

## Puntos de control humanos

Detente y pregunta en: (a) logins y prerrequisitos, (b) aprobación de la spec, (c) antes del primer push público (mostrar resultado de gitleaks). Los logins interactivos (`supabase login`, `vercel login`) los hace la persona en su terminal.

## Reglas de Next.js para agentes

Next.js 16 genera `AGENTS.md` con instrucciones para agentes de código (leer la documentación incluida en `node_modules/next/dist/docs/` antes de escribir código). Lo importamos aquí:

@AGENTS.md
