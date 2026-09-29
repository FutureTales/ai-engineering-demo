# Verificación de los 11 tags (2026-09-29)

Cada tag se sacó en un `git worktree` limpio: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test` y `pnpm build`.

```
paso-00-dar-forma: docs only (no app) OK
paso-01-entorno-agente: docs only (no app) OK
paso-02-arquitectura-datos: typecheck=ok tests=[Tests  5 passed (5)] build=ok
paso-03-primer-llm: typecheck=ok tests=[Tests  5 passed (5)] build=ok
paso-04-evals: typecheck=ok tests=[Tests  33 passed (33)] build=ok
paso-05-rag: typecheck=ok tests=[Tests  35 passed (35)] build=ok
paso-06-agente: typecheck=ok tests=[Tests  52 passed (52)] build=ok
paso-07-ml-clasico: typecheck=ok tests=[Tests  52 passed (52)] build=ok
paso-08-producto-completo: typecheck=ok tests=[Tests  65 passed (65)] build=ok
paso-09-produccion: typecheck=ok tests=[Tests  65 passed (65)] build=ok
paso-10-cierre: typecheck=ok tests=[Tests  65 passed (65)] build=ok
```
