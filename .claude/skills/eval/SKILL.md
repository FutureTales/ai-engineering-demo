---
name: eval
description: Run the Innova Copilot evals (mock or live), then summarize the results against the previous run using only numbers from the result files. Use when the user types /eval or asks to run, compare or summarize evals.
argument-hint: "[--mock | --live] [--limit N]"
---

# /eval — correr y resumir evals

Corres las evals del proyecto y resumes los resultados **sin inventar nada**.

## Pasos

1. Modo: si `$ARGUMENTS` incluye `--live`, corre `pnpm eval`. Si no, corre `pnpm eval --mock` (gratis, sin red). Si el usuario pide live, recuérdale que cuesta tokens y confirma antes.
2. Espera a que termine. Si falla, muestra el error tal cual y detente. No reintentes cambiando el código de las evals para que pasen.
3. Abre el archivo de resultados más reciente en `evals/results/` y el anterior de la **misma** modalidad (mock con mock, live con live).
4. Resume en español, en una tabla:
   - Versión evaluada (commit o tag) y fecha.
   - Cada métrica determinista (% de casos que pasan) y el promedio del juez por criterio.
   - La diferencia contra la corrida anterior (↑/↓ y puntos porcentuales).
   - Costo total y latencia p50/p95 de la corrida, si el archivo los trae.
5. Lista los **3 casos que fallaron** más ilustrativos: id, qué se esperaba, qué respondió el modelo, qué métrica falló.
6. Sugiere una sola hipótesis para la siguiente iteración (el ciclo construir → medir → analizar errores → decidir).

## Reglas

- Todo número sale de los archivos en `evals/results/`. Si un dato no está, escribe "no medido".
- No edites `evals/dataset.jsonl` ni `evals/rubric.md` para mejorar un puntaje.
- Una corrida mock mide el runner, no el modelo. Dilo en el resumen.
